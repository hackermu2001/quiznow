import { Router } from 'express';
import crypto from 'node:crypto';
import { db, getQuizWithQuestions } from '../db.js';
import { optionalAuth, requireAuth } from '../auth.js';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  const { scope = 'discover', q = '', category = '' } = req.query;
  const conditions = [];
  const params = [];

  if (scope === 'mine') {
    if (!req.user) {
      return res.status(401).json({ error: 'Login untuk melihat kuis milikmu.' });
    }
    conditions.push('qz.user_id = ?');
    params.push(req.user.id);
  } else {
    if (req.user) {
      conditions.push('(qz.is_public = 1 OR qz.user_id = ?)');
      params.push(req.user.id);
    } else {
      conditions.push('qz.is_public = 1');
    }
  }

  if (q && q.trim()) {
    conditions.push('(LOWER(qz.title) LIKE ? OR LOWER(qz.description) LIKE ?)');
    const like = `%${q.trim().toLowerCase()}%`;
    params.push(like, like);
  }

  if (category && category !== 'Semua') {
    conditions.push('qz.category = ?');
    params.push(category);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT qz.*, u.username as author_name, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM questions WHERE quiz_id = qz.id) as question_count
       FROM quizzes qz
       JOIN users u ON u.id = qz.user_id
       ${whereClause}
       ORDER BY qz.updated_at DESC`
    )
    .all(...params);

  res.json({
    quizzes: rows.map((r) => ({ ...r, is_public: Boolean(r.is_public) })),
  });
});

router.get('/:id', optionalAuth, (req, res) => {
  const quiz = getQuizWithQuestions(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }
  if (!quiz.is_public && (!req.user || req.user.id !== quiz.user_id)) {
    return res.status(403).json({ error: 'Kuis ini bersifat privat.' });
  }
  res.json({ quiz });
});

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'Kuis harus memiliki minimal 1 pertanyaan.';
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text || !q.text.trim()) {
      return `Pertanyaan #${i + 1} belum memiliki teks soal.`;
    }
    if (q.type === 'type_answer') {
      const valid = (q.acceptedAnswers || []).filter((a) => a && a.trim());
      if (valid.length === 0) {
        return `Pertanyaan #${i + 1} (Ketik Jawaban) harus memiliki minimal 1 jawaban benar.`;
      }
    } else {
      const opts = (q.options || []).filter((o) => o && o.text && o.text.trim());
      if (opts.length < 2) {
        return `Pertanyaan #${i + 1} harus memiliki minimal 2 pilihan jawaban.`;
      }
      if (!opts.some((o) => o.isCorrect)) {
        return `Pertanyaan #${i + 1} harus memiliki minimal 1 jawaban benar.`;
      }
    }
  }
  return null;
}

router.post('/', requireAuth, (req, res) => {
  const {
    title,
    description = '',
    cover_color = '#46178f',
    category = 'Umum',
    is_public = true,
    questions = [],
  } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Judul kuis wajib diisi.' });
  }

  const qErr = validateQuestions(questions);
  if (qErr) return res.status(400).json({ error: qErr });

  const quizId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO quizzes (id, user_id, title, description, cover_color, category, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(quizId, req.user.id, title.trim(), description.trim(), cover_color, category, is_public ? 1 : 0);

  const insertQ = db.prepare(
    `INSERT INTO questions (id, quiz_id, position, type, text, image_url, time_limit, points_mode, options_json, accepted_answers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  questions.forEach((q, idx) => {
    insertQ.run(
      crypto.randomUUID(),
      quizId,
      idx,
      q.type || 'quiz',
      q.text.trim(),
      (q.imageUrl || '').trim(),
      Number(q.timeLimit) || 20,
      q.pointsMode || 'standard',
      JSON.stringify(q.options || []),
      JSON.stringify((q.acceptedAnswers || []).map((a) => a.trim()).filter(Boolean))
    );
  });

  res.status(201).json({ quiz: getQuizWithQuestions(quizId) });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Kamu tidak punya izin mengedit kuis ini.' });
  }

  const {
    title,
    description = '',
    cover_color = '#46178f',
    category = 'Umum',
    is_public = true,
    questions = [],
  } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Judul kuis wajib diisi.' });
  }

  const qErr = validateQuestions(questions);
  if (qErr) return res.status(400).json({ error: qErr });

  db.prepare(
    `UPDATE quizzes
     SET title = ?, description = ?, cover_color = ?, category = ?, is_public = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(title.trim(), description.trim(), cover_color, category, is_public ? 1 : 0, req.params.id);

  db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(req.params.id);

  const insertQ = db.prepare(
    `INSERT INTO questions (id, quiz_id, position, type, text, image_url, time_limit, points_mode, options_json, accepted_answers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  questions.forEach((q, idx) => {
    insertQ.run(
      crypto.randomUUID(),
      req.params.id,
      idx,
      q.type || 'quiz',
      q.text.trim(),
      (q.imageUrl || '').trim(),
      Number(q.timeLimit) || 20,
      q.pointsMode || 'standard',
      JSON.stringify(q.options || []),
      JSON.stringify((q.acceptedAnswers || []).map((a) => a.trim()).filter(Boolean))
    );
  });

  res.json({ quiz: getQuizWithQuestions(req.params.id) });
});

router.post('/:id/duplicate', requireAuth, (req, res) => {
  const source = getQuizWithQuestions(req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }
  if (!source.is_public && source.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Tidak dapat menduplikasi kuis privat.' });
  }

  const newId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO quizzes (id, user_id, title, description, cover_color, category, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    req.user.id,
    `${source.title} (Salinan)`,
    source.description,
    source.cover_color,
    source.category,
    1
  );

  const insertQ = db.prepare(
    `INSERT INTO questions (id, quiz_id, position, type, text, image_url, time_limit, points_mode, options_json, accepted_answers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  source.questions.forEach((q, idx) => {
    insertQ.run(
      crypto.randomUUID(),
      newId,
      idx,
      q.type,
      q.text,
      q.imageUrl || '',
      q.timeLimit,
      q.pointsMode,
      JSON.stringify(q.options || []),
      JSON.stringify(q.acceptedAnswers || [])
    );
  });

  res.status(201).json({ quiz: getQuizWithQuestions(newId) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Kamu tidak punya izin menghapus kuis ini.' });
  }
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
