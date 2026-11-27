import { Router } from 'express';
import crypto from 'node:crypto';
import { db, hashPasswordSync } from '../db.js';
import { verifyPassword, signToken, requireAuth } from '../auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, email, password, avatar = '🦊' } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, dan password wajib diisi.' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username minimal 3 karakter.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();

  const existing = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
    .get(normalizedEmail, cleanUsername.toLowerCase());

  if (existing) {
    return res.status(409).json({ error: 'Email atau username sudah terdaftar.' });
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPasswordSync(password);

  db.prepare(
    'INSERT INTO users (id, username, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cleanUsername, normalizedEmail, passwordHash, avatar);

  const user = { id, username: cleanUsername, email: normalizedEmail, avatar };
  const token = signToken({ userId: id });
  res.status(201).json({ user, token });
});

router.post('/login', (req, res) => {
  const { identifier, email, password } = req.body || {};
  const loginKey = (identifier || email || '').trim().toLowerCase();

  if (!loginKey || !password) {
    return res.status(400).json({ error: 'Email/username dan password wajib diisi.' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
    .get(loginKey, loginKey);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email/username atau password salah.' });
  }

  const token = signToken({ userId: user.id });
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    },
    token,
  });
});

router.get('/config', (_req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

router.post('/google', async (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  if (!googleClientId) {
    return res.status(503).json({
      error: 'Login Google belum dikonfigurasi di server (GOOGLE_CLIENT_ID belum diisi).',
    });
  }

  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Token Google tidak ditemukan.' });
  }

  try {
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    const payload = await verifyRes.json();

    if (!verifyRes.ok || payload.error) {
      return res.status(401).json({ error: 'Token Google tidak valid atau sudah kedaluwarsa.' });
    }

    if (payload.aud !== googleClientId) {
      return res.status(401).json({ error: 'Token Google tidak cocok dengan Client ID aplikasi.' });
    }

    const validIssuer =
      payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com';
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!validIssuer || !emailVerified || !payload.email || !payload.sub) {
      return res.status(401).json({ error: 'Akun Google tidak terverifikasi.' });
    }

    const googleId = String(payload.sub);
    const email = String(payload.email).trim().toLowerCase();
    const picture = payload.picture ? String(payload.picture) : '🦊';

    let user = db
      .prepare('SELECT id, username, email, avatar, google_id FROM users WHERE google_id = ? OR LOWER(email) = ?')
      .get(googleId, email);

    if (user) {
      if (!user.google_id) {
        db.prepare('UPDATE users SET google_id = ?, avatar = ? WHERE id = ?').run(
          googleId,
          user.avatar || picture,
          user.id
        );
      }
    } else {
      const baseName = (payload.name || email.split('@')[0] || 'User')
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .trim()
        .slice(0, 18) || 'QuizUser';

      let username = baseName;
      let attempts = 0;
      while (
        db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(username.toLowerCase())
      ) {
        attempts++;
        username = `${baseName.slice(0, 14)}${Math.floor(100 + Math.random() * 900)}`;
        if (attempts > 10) {
          username = `User${crypto.randomBytes(3).toString('hex')}`;
          break;
        }
      }

      const id = crypto.randomUUID();
      const randomPasswordHash = hashPasswordSync(crypto.randomBytes(24).toString('hex'));

      db.prepare(
        'INSERT INTO users (id, username, email, password_hash, avatar, google_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, username, email, randomPasswordHash, picture, googleId);

      user = { id, username, email, avatar: picture };
    }

    const token = signToken({ userId: user.id });
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi akun Google. Coba lagi.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
