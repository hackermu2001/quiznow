import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quizzes.js';
import reportRoutes from './routes/reports.js';
import { GameManager } from './game/GameManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'QuizNow', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/reports', reportRoutes);

// Serve built React frontend if available
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const gameManager = new GameManager(io);
io.on('connection', (socket) => {
  gameManager.registerSocket(socket);
});

server.listen(PORT, () => {
  console.log(`QuizNow server running at http://localhost:${PORT}`);
});
