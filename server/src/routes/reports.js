import { Router } from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../auth.js';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  const rows = req.user
    ? db
        .prepare(
          `SELECT id, quiz_id, quiz_title, pin, started_at, ended_at, player_count, question_count
           FROM game_reports
           WHERE host_user_id = ? OR host_user_id IS NULL
           ORDER BY ended_at DESC
           LIMIT 50`
        )
        .all(req.user.id)
    : db
        .prepare(
          `SELECT id, quiz_id, quiz_title, pin, started_at, ended_at, player_count, question_count
           FROM game_reports
           ORDER BY ended_at DESC
           LIMIT 30`
        )
        .all();

  res.json({ reports: rows });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM game_reports WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }
  res.json({
    report: {
      ...row,
      summary: JSON.parse(row.summary_json),
    },
  });
});

router.get('/:id/csv', (req, res) => {
  const row = db.prepare('SELECT * FROM game_reports WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }
  const summary = JSON.parse(row.summary_json);
  const headers = ['Peringkat', 'Nickname', 'Total Skor', 'Jawaban Benar', 'Total Soal', 'Akurasi (%)', 'Streak Terbaik'];
  const lines = [headers.join(',')];

  (summary.players || []).forEach((p, idx) => {
    const accuracy = row.question_count > 0 ? Math.round((p.correctCount / row.question_count) * 100) : 0;
    const escapedName = `"${String(p.nickname).replace(/"/g, '""')}"`;
    lines.push([idx + 1, escapedName, p.score, p.correctCount, row.question_count, accuracy, p.maxStreak].join(','));
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="quiznow-report-${row.pin}.csv"`);
  res.send('\uFEFF' + lines.join('\n'));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM game_reports WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
