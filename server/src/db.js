import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'quiznow.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🦊',
    google_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_color TEXT NOT NULL DEFAULT '#46178f',
    category TEXT NOT NULL DEFAULT 'Umum',
    is_public INTEGER NOT NULL DEFAULT 1,
    play_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'quiz',
    text TEXT NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    time_limit INTEGER NOT NULL DEFAULT 20,
    points_mode TEXT NOT NULL DEFAULT 'standard',
    options_json TEXT NOT NULL DEFAULT '[]',
    accepted_answers_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS game_reports (
    id TEXT PRIMARY KEY,
    quiz_id TEXT,
    quiz_title TEXT NOT NULL,
    host_user_id TEXT,
    pin TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    player_count INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    summary_json TEXT NOT NULL
  );
`);

export function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

// Safe migration for existing databases without google_id column
try {
  db.exec('ALTER TABLE users ADD COLUMN google_id TEXT;');
} catch {
  // Column already exists
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;');

function seedDatabase() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) return;

  const demoUserId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)`
  ).run(demoUserId, 'QuizMaster', 'demo@quiznow.id', hashPasswordSync('demo123'), '🚀');

  const sampleQuizzes = [
    {
      title: 'Pengetahuan Umum Indonesia',
      description: 'Uji wawasanmu seputar geografi, budaya, sejarah, dan fakta seru Nusantara!',
      cover_color: '#e21b3c',
      category: 'Pengetahuan Umum',
      questions: [
        {
          type: 'quiz',
          text: 'Apa nama danau vulkanik terbesar di Indonesia dan Asia Tenggara?',
          time_limit: 20,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'Danau Toba', isCorrect: true },
            { id: 'b', text: 'Danau Singkarak', isCorrect: false },
            { id: 'c', text: 'Danau Sentani', isCorrect: false },
            { id: 'd', text: 'Danau Kelimutu', isCorrect: false },
          ],
        },
        {
          type: 'true_false',
          text: 'Indonesia memiliki lebih dari 17.000 pulau dari Sabang sampai Merauke.',
          time_limit: 15,
          points_mode: 'standard',
          options: [
            { id: 'true', text: 'Benar', isCorrect: true },
            { id: 'false', text: 'Salah', isCorrect: false },
          ],
        },
        {
          type: 'quiz',
          text: 'Candi Borobudur terletak di provinsi mana?',
          time_limit: 20,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'DI Yogyakarta', isCorrect: false },
            { id: 'b', text: 'Jawa Tengah', isCorrect: true },
            { id: 'c', text: 'Jawa Timur', isCorrect: false },
            { id: 'd', text: 'Jawa Barat', isCorrect: false },
          ],
        },
        {
          type: 'type_answer',
          text: 'Apa semboyan negara Indonesia yang tertulis pada pita Garuda Pancasila?',
          time_limit: 30,
          points_mode: 'double',
          acceptedAnswers: ['Bhinneka Tunggal Ika', 'Bineka Tunggal Ika'],
        },
        {
          type: 'quiz',
          text: 'Satwa endemik Komodo hanya dapat ditemukan secara alami di provinsi...',
          time_limit: 20,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'Nusa Tenggara Barat', isCorrect: false },
            { id: 'b', text: 'Bali', isCorrect: false },
            { id: 'c', text: 'Nusa Tenggara Timur', isCorrect: true },
            { id: 'd', text: 'Maluku', isCorrect: false },
          ],
        },
      ],
    },
    {
      title: 'Teknologi & Pemrograman',
      description: 'Seberapa tajam pengetahuanmu tentang Web, JavaScript, AI, dan komputer?',
      cover_color: '#1368ce',
      category: 'Teknologi',
      questions: [
        {
          type: 'quiz',
          text: 'Protokol apa yang digunakan untuk komunikasi real-time dua arah pada aplikasi seperti QuizNow?',
          time_limit: 20,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'FTP', isCorrect: false },
            { id: 'b', text: 'WebSocket', isCorrect: true },
            { id: 'c', text: 'SMTP', isCorrect: false },
            { id: 'd', text: 'SNMP', isCorrect: false },
          ],
        },
        {
          type: 'quiz',
          text: 'Di JavaScript, hasil dari ekspresi typeof null adalah...',
          time_limit: 20,
          points_mode: 'double',
          options: [
            { id: 'a', text: '"null"', isCorrect: false },
            { id: 'b', text: '"undefined"', isCorrect: false },
            { id: 'c', text: '"object"', isCorrect: true },
            { id: 'd', text: '"boolean"', isCorrect: false },
          ],
        },
        {
          type: 'true_false',
          text: 'HTTP status code 404 menandakan bahwa server mengalami Internal Server Error.',
          time_limit: 15,
          points_mode: 'standard',
          options: [
            { id: 'true', text: 'Benar', isCorrect: false },
            { id: 'false', text: 'Salah', isCorrect: true },
          ],
        },
        {
          type: 'quiz',
          text: 'Struktur data mana yang bekerja dengan prinsip LIFO (Last In, First Out)?',
          time_limit: 20,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'Queue', isCorrect: false },
            { id: 'b', text: 'Stack', isCorrect: true },
            { id: 'c', text: 'Linked List', isCorrect: false },
            { id: 'd', text: 'Hash Map', isCorrect: false },
          ],
        },
        {
          type: 'type_answer',
          text: 'Apa kepanjangan singkatan "HTML"? (Bahasa Inggris)',
          time_limit: 30,
          points_mode: 'standard',
          acceptedAnswers: ['HyperText Markup Language', 'Hyper Text Markup Language'],
        },
      ],
    },
    {
      title: 'Sains & Alam Semesta',
      description: 'Jelajahi keajaiban fisika, kimia, biologi, dan luar angkasa dalam kuis cepat!',
      cover_color: '#26890c',
      category: 'Sains',
      questions: [
        {
          type: 'quiz',
          text: 'Planet terbesar di Tata Surya kita adalah...',
          time_limit: 15,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'Saturnus', isCorrect: false },
            { id: 'b', text: 'Jupiter', isCorrect: true },
            { id: 'c', text: 'Neptunus', isCorrect: false },
            { id: 'd', text: 'Uranus', isCorrect: false },
          ],
        },
        {
          type: 'true_false',
          text: 'Cahaya bergerak lebih cepat daripada suara.',
          time_limit: 10,
          points_mode: 'standard',
          options: [
            { id: 'true', text: 'Benar', isCorrect: true },
            { id: 'false', text: 'Salah', isCorrect: false },
          ],
        },
        {
          type: 'quiz',
          text: 'Unsur kimia dengan simbol "Au" adalah...',
          time_limit: 20,
          points_mode: 'double',
          options: [
            { id: 'a', text: 'Perak', isCorrect: false },
            { id: 'b', text: 'Aluminium', isCorrect: false },
            { id: 'c', text: 'Emas', isCorrect: true },
            { id: 'd', text: 'Argon', isCorrect: false },
          ],
        },
        {
          type: 'quiz',
          text: 'Organel sel yang dijuluki "pembangkit tenaga sel" (powerhouse of the cell) adalah...',
          time_limit: 20,
          points_mode: 'standard',
          options: [
            { id: 'a', text: 'Ribosom', isCorrect: false },
            { id: 'b', text: 'Mitokondria', isCorrect: true },
            { id: 'c', text: 'Lisosom', isCorrect: false },
            { id: 'd', text: 'Badan Golgi', isCorrect: false },
          ],
        },
      ],
    },
  ];

  const insertQuiz = db.prepare(
    `INSERT INTO quizzes (id, user_id, title, description, cover_color, category, is_public) VALUES (?, ?, ?, ?, ?, ?, 1)`
  );
  const insertQuestion = db.prepare(
    `INSERT INTO questions (id, quiz_id, position, type, text, image_url, time_limit, points_mode, options_json, accepted_answers_json)
     VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?)`
  );

  for (const qz of sampleQuizzes) {
    const quizId = crypto.randomUUID();
    insertQuiz.run(quizId, demoUserId, qz.title, qz.description, qz.cover_color, qz.category);
    qz.questions.forEach((q, idx) => {
      insertQuestion.run(
        crypto.randomUUID(),
        quizId,
        idx,
        q.type,
        q.text,
        q.time_limit,
        q.points_mode,
        JSON.stringify(q.options || []),
        JSON.stringify(q.acceptedAnswers || [])
      );
    });
  }
}

seedDatabase();

export function getQuizWithQuestions(quizId) {
  const quiz = db
    .prepare(
      `SELECT q.*, u.username as author_name, u.avatar as author_avatar
       FROM quizzes q
       JOIN users u ON u.id = q.user_id
       WHERE q.id = ?`
    )
    .get(quizId);

  if (!quiz) return null;

  const rows = db
    .prepare(`SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC`)
    .all(quizId);

  return {
    ...quiz,
    is_public: Boolean(quiz.is_public),
    questions: rows.map((row) => ({
      id: row.id,
      position: row.position,
      type: row.type,
      text: row.text,
      imageUrl: row.image_url,
      timeLimit: row.time_limit,
      pointsMode: row.points_mode,
      options: JSON.parse(row.options_json || '[]'),
      acceptedAnswers: JSON.parse(row.accepted_answers_json || '[]'),
    })),
  };
}
