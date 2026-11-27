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

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
