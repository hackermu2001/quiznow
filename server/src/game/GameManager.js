import crypto from 'node:crypto';
import { db, getQuizWithQuestions } from '../db.js';
import { verifyToken } from '../auth.js';

const BOT_PROFILES = [
  { nickname: 'BudiBot', avatar: '🤖' },
  { nickname: 'SitiPintar', avatar: '🦉' },
  { nickname: 'RakaCepat', avatar: '⚡' },
  { nickname: 'NadiaPro', avatar: '🦊' },
  { nickname: 'AndiJuara', avatar: '🦁' },
  { nickname: 'DinaStar', avatar: '🌟' },
];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map(); // pin -> game object
    this.socketToGame = new Map(); // socketId -> { pin, role: 'host' | 'player', playerId? }
  }

  generatePin() {
    let pin;
    do {
      pin = String(Math.floor(100000 + Math.random() * 900000));
    } while (this.games.has(pin));
    return pin;
  }

  registerSocket(socket) {
    socket.on('host:create', (payload, cb) => this.handleHostCreate(socket, payload, cb));
    socket.on('host:update-settings', (payload) => this.handleUpdateSettings(socket, payload));
    socket.on('host:add-bots', (payload, cb) => this.handleAddBots(socket, payload, cb));
    socket.on('host:kick-player', (payload) => this.handleKickPlayer(socket, payload));
    socket.on('host:start', (cb) => this.handleHostStart(socket, cb));
    socket.on('host:skip-timer', () => this.handleHostSkipTimer(socket));
    socket.on('host:next', () => this.handleHostNext(socket));
    socket.on('host:end', () => this.handleHostEnd(socket));

    socket.on('player:check-pin', ({ pin }, cb) => {
      const game = this.games.get(String(pin || '').trim());
      if (!game) {
        return cb?.({ ok: false, error: 'PIN game tidak ditemukan. Periksa kembali!' });
      }
      if (game.settings.lockLobby && game.state === 'LOBBY') {
        return cb?.({ ok: false, error: 'Lobby sedang dikunci oleh Host.' });
      }
      if (game.state === 'PODIUM') {
        return cb?.({ ok: false, error: 'Game ini sudah berakhir.' });
      }
      return cb?.({ ok: true, quizTitle: game.quiz.title, state: game.state });
    });

    socket.on('player:join', (payload, cb) => this.handlePlayerJoin(socket, payload, cb));
    socket.on('player:answer', (payload, cb) => this.handlePlayerAnswer(socket, payload, cb));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  handleHostCreate(socket, { quizId, token }, cb) {
    const quiz = getQuizWithQuestions(quizId);
    if (!quiz) {
      return cb?.({ ok: false, error: 'Kuis tidak ditemukan.' });
    }
    if (!quiz.questions.length) {
      return cb?.({ ok: false, error: 'Kuis belum memiliki pertanyaan.' });
    }

    let hostUserId = null;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.userId) hostUserId = decoded.userId;
    }

    const pin = this.generatePin();
    const game = {
      pin,
      hostSocketId: socket.id,
      hostUserId,
      quiz,
      questions: [],
      state: 'LOBBY', // LOBBY | GET_READY | QUESTION | QUESTION_RESULT | LEADERBOARD | PODIUM
      currentQuestionIndex: -1,
      questionStartTime: 0,
      questionEndTime: 0,
      timerHandle: null,
      botTimers: [],
      startedAt: null,
      reportId: null,
      settings: {
        randomizeQuestions: false,
        randomizeAnswers: false,
        lockLobby: false,
        autoAdvance: false,
      },
      players: new Map(), // playerId -> player
      questionStats: [],
    };

    this.games.set(pin, game);
    this.socketToGame.set(socket.id, { pin, role: 'host' });
    socket.join(`game:${pin}`);
    socket.join(`host:${pin}`);

    db.prepare('UPDATE quizzes SET play_count = play_count + 1 WHERE id = ?').run(quiz.id);

    cb?.({
      ok: true,
      pin,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        cover_color: quiz.cover_color,
        questionCount: quiz.questions.length,
      },
      settings: game.settings,
    });
  }

  handleUpdateSettings(socket, settings) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return;
    const game = this.games.get(meta.pin);
    if (!game) return;

    game.settings = { ...game.settings, ...settings };
    this.io.to(`host:${game.pin}`).emit('host:settings-updated', game.settings);
  }

  handleAddBots(socket, { count = 3 } = {}, cb) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return cb?.({ ok: false });
    const game = this.games.get(meta.pin);
    if (!game || game.state !== 'LOBBY') return cb?.({ ok: false });

    const existingNames = new Set([...game.players.values()].map((p) => p.nickname.toLowerCase()));
    const available = BOT_PROFILES.filter((b) => !existingNames.has(b.nickname.toLowerCase()));
    const toAdd = available.slice(0, count);

    for (const bot of toAdd) {
      const id = `bot-${crypto.randomUUID().slice(0, 8)}`;
      game.players.set(id, {
        id,
        token: id,
        socketId: null,
        nickname: bot.nickname,
        avatar: bot.avatar,
        isBot: true,
        connected: true,
        score: 0,
        lastPoints: 0,
        streak: 0,
        maxStreak: 0,
        correctCount: 0,
        answers: {},
      });
    }

    this.emitLobbyPlayers(game);
    cb?.({ ok: true, added: toAdd.length });
  }

  handleKickPlayer(socket, { playerId }) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return;
    const game = this.games.get(meta.pin);
    if (!game) return;

    const player = game.players.get(playerId);
    if (!player) return;

    if (player.socketId) {
      this.io.to(player.socketId).emit('player:kicked', {
        reason: 'Kamu dikeluarkan dari ruangan oleh Host.',
      });
      this.socketToGame.delete(player.socketId);
    }
    game.players.delete(playerId);
    this.emitLobbyPlayers(game);
  }

  handlePlayerJoin(socket, { pin, nickname, avatar = '🦊', playerToken }, cb) {
    const cleanPin = String(pin || '').trim();
    const game = this.games.get(cleanPin);
    if (!game) {
      return cb?.({ ok: false, error: 'PIN game tidak ditemukan.' });
    }

    // Reconnect check
    if (playerToken) {
      const existing = [...game.players.values()].find((p) => p.token === playerToken);
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        this.socketToGame.set(socket.id, { pin: cleanPin, role: 'player', playerId: existing.id });
        socket.join(`game:${cleanPin}`);
        this.emitLobbyPlayers(game);

        return cb?.({
          ok: true,
          reconnected: true,
          player: {
            id: existing.id,
            token: existing.token,
            nickname: existing.nickname,
            avatar: existing.avatar,
            score: existing.score,
          },
          gameState: this.buildPlayerSyncState(game, existing),
        });
      }
    }

    if (game.settings.lockLobby && game.state === 'LOBBY') {
      return cb?.({ ok: false, error: 'Lobby sedang dikunci oleh Host.' });
    }
    if (game.state === 'PODIUM') {
      return cb?.({ ok: false, error: 'Game sudah selesai.' });
    }

    const cleanName = String(nickname || '').trim().slice(0, 20);
    if (!cleanName) {
      return cb?.({ ok: false, error: 'Nickname wajib diisi.' });
    }

    const duplicate = [...game.players.values()].some(
      (p) => p.nickname.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      return cb?.({ ok: false, error: 'Nickname sudah dipakai pemain lain. Pilih nama lain!' });
    }

    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const player = {
      id: playerId,
      token,
      socketId: socket.id,
      nickname: cleanName,
      avatar,
      isBot: false,
      connected: true,
      score: 0,
      lastPoints: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      answers: {},
    };

    game.players.set(playerId, player);
    this.socketToGame.set(socket.id, { pin: cleanPin, role: 'player', playerId });
    socket.join(`game:${cleanPin}`);

    this.emitLobbyPlayers(game);

    cb?.({
      ok: true,
      player: { id: player.id, token: player.token, nickname: player.nickname, avatar: player.avatar, score: 0 },
      gameState: this.buildPlayerSyncState(game, player),
    });
  }

  buildPlayerSyncState(game, player) {
    const q = game.questions[game.currentQuestionIndex];
    const base = {
      state: game.state,
      quizTitle: game.quiz.title,
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length || game.quiz.questions.length,
    };

    if (game.state === 'QUESTION' && q) {
      const answered = Boolean(player.answers[game.currentQuestionIndex]);
      return {
        ...base,
        answered,
        question: this.sanitizeQuestionForPlayer(q),
        remainingMs: Math.max(0, game.questionEndTime - Date.now()),
      };
    }

    return base;
  }

  emitLobbyPlayers(game) {
    const list = [...game.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      isBot: p.isBot,
      connected: p.connected,
      score: p.score,
    }));
    this.io.to(`host:${game.pin}`).emit('lobby:players', { players: list });
    this.io.to(`game:${game.pin}`).emit('game:player-count', { count: list.length });
  }

  handleHostStart(socket, cb) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return cb?.({ ok: false, error: 'Unauthorized' });
    const game = this.games.get(meta.pin);
    if (!game || game.state !== 'LOBBY') return cb?.({ ok: false, error: 'Game sudah dimulai.' });
    if (game.players.size === 0) {
      return cb?.({ ok: false, error: 'Minimal 1 pemain dibutuhkan untuk memulai (atau tambahkan Bot Demo!).' });
    }

    let prepared = game.quiz.questions.map((q) => ({
      ...q,
      options: q.type === 'quiz' && game.settings.randomizeAnswers ? shuffleArray(q.options) : [...q.options],
    }));

    if (game.settings.randomizeQuestions) {
      prepared = shuffleArray(prepared);
    }

    game.questions = prepared;
    game.startedAt = new Date().toISOString();
    game.currentQuestionIndex = 0;

    cb?.({ ok: true });
    this.startGetReady(game);
  }

  clearTimers(game) {
    if (game.timerHandle) {
      clearTimeout(game.timerHandle);
      game.timerHandle = null;
    }
    for (const bt of game.botTimers) clearTimeout(bt);
    game.botTimers = [];
  }

  startGetReady(game) {
    this.clearTimers(game);
    game.state = 'GET_READY';
    const q = game.questions[game.currentQuestionIndex];
    const payload = {
      state: 'GET_READY',
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      questionType: q.type,
      pointsMode: q.pointsMode,
      countdownSec: 3,
    };

    this.io.to(`game:${game.pin}`).emit('game:get-ready', payload);

    game.timerHandle = setTimeout(() => {
      this.startQuestion(game);
    }, 3200);
  }

  sanitizeQuestionForPlayer(q) {
    return {
      id: q.id,
      type: q.type,
      text: q.text,
      imageUrl: q.imageUrl,
      timeLimit: q.timeLimit,
      pointsMode: q.pointsMode,
      options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
    };
  }

  startQuestion(game) {
    this.clearTimers(game);
    game.state = 'QUESTION';
    const q = game.questions[game.currentQuestionIndex];
    const durationMs = q.timeLimit * 1000;
    game.questionStartTime = Date.now();
    game.questionEndTime = game.questionStartTime + durationMs;

    const payload = {
      state: 'QUESTION',
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      question: this.sanitizeQuestionForPlayer(q),
      durationMs,
      totalPlayers: game.players.size,
    };

    this.io.to(`game:${game.pin}`).emit('game:question', payload);

    // Schedule bot answers
    for (const player of game.players.values()) {
      if (!player.isBot) continue;
      const delay = Math.min(durationMs - 1000, Math.floor(1500 + Math.random() * Math.min(durationMs * 0.65, 8000)));
      const bt = setTimeout(() => {
        if (game.state !== 'QUESTION') return;
        this.submitBotAnswer(game, player, q);
      }, Math.max(800, delay));
      game.botTimers.push(bt);
    }

    game.timerHandle = setTimeout(() => {
      this.finishQuestion(game);
    }, durationMs);
  }

  submitBotAnswer(game, bot, q) {
    const willBeCorrect = Math.random() < 0.72;
    if (q.type === 'type_answer') {
      const answerText = willBeCorrect
        ? q.acceptedAnswers[0] || ''
        : 'Jawaban Acak';
      this.recordAnswer(game, bot, { answerText });
    } else {
      const correctOpts = q.options.filter((o) => o.isCorrect);
      const wrongOpts = q.options.filter((o) => !o.isCorrect);
      const chosen =
        willBeCorrect && correctOpts.length
          ? correctOpts[Math.floor(Math.random() * correctOpts.length)]
          : wrongOpts.length
          ? wrongOpts[Math.floor(Math.random() * wrongOpts.length)]
          : q.options[0];
      if (chosen) {
        this.recordAnswer(game, bot, { optionId: chosen.id });
      }
    }
  }

  handlePlayerAnswer(socket, { optionId, answerText }, cb) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'player') return cb?.({ ok: false, error: 'Tidak dalam permainan.' });
    const game = this.games.get(meta.pin);
    if (!game || game.state !== 'QUESTION') {
      return cb?.({ ok: false, error: 'Waktu menjawab sudah habis.' });
    }

    const player = game.players.get(meta.playerId);
    if (!player) return cb?.({ ok: false, error: 'Pemain tidak ditemukan.' });

    if (player.answers[game.currentQuestionIndex]) {
      return cb?.({ ok: false, error: 'Kamu sudah menjawab soal ini.' });
    }

    this.recordAnswer(game, player, { optionId, answerText });
    cb?.({ ok: true });
  }

  recordAnswer(game, player, { optionId, answerText }) {
    const qIdx = game.currentQuestionIndex;
    const q = game.questions[qIdx];
    const elapsedMs = Math.max(0, Date.now() - game.questionStartTime);
    const totalMs = q.timeLimit * 1000;

    let isCorrect = false;
    if (q.type === 'type_answer') {
      const clean = String(answerText || '').trim().toLowerCase();
      isCorrect = (q.acceptedAnswers || []).some((a) => a.trim().toLowerCase() === clean);
    } else {
      const chosen = (q.options || []).find((o) => o.id === optionId);
      isCorrect = Boolean(chosen?.isCorrect);
    }

    let basePoints = 1000;
    if (q.pointsMode === 'double') basePoints = 2000;
    if (q.pointsMode === 'none') basePoints = 0;

    let pointsEarned = 0;
    let streakBonus = 0;

    if (isCorrect) {
      player.streak += 1;
      player.maxStreak = Math.max(player.maxStreak, player.streak);
      player.correctCount += 1;

      if (basePoints > 0) {
        const speedFactor = Math.max(0, Math.min(1, elapsedMs / totalMs));
        pointsEarned = Math.round((1 - speedFactor / 2) * basePoints);
        if (player.streak >= 2) {
          streakBonus = Math.min(500, (player.streak - 1) * 100);
        }
        pointsEarned += streakBonus;
      }
    } else {
      player.streak = 0;
    }

    player.lastPoints = pointsEarned;
    player.score += pointsEarned;
    player.answers[qIdx] = {
      optionId: optionId || null,
      answerText: answerText || null,
      isCorrect,
      pointsEarned,
      streakBonus,
      responseTimeMs: elapsedMs,
    };

    const answeredCount = [...game.players.values()].filter((p) => p.answers[qIdx]).length;
    this.io.to(`host:${game.pin}`).emit('game:answer-count', {
      answeredCount,
      totalPlayers: game.players.size,
    });

    if (answeredCount >= game.players.size && game.players.size > 0) {
      this.finishQuestion(game);
    }
  }

  handleHostSkipTimer(socket) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return;
    const game = this.games.get(meta.pin);
    if (!game || game.state !== 'QUESTION') return;
    this.finishQuestion(game);
  }

  getRankedPlayers(game) {
    return [...game.players.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctCount - a.correctCount;
    });
  }

  finishQuestion(game) {
    if (game.state !== 'QUESTION') return;
    this.clearTimers(game);
    game.state = 'QUESTION_RESULT';

    const qIdx = game.currentQuestionIndex;
    const q = game.questions[qIdx];

    // Mark non-responders as streak = 0
    for (const p of game.players.values()) {
      if (!p.answers[qIdx]) {
        p.streak = 0;
        p.lastPoints = 0;
      }
    }

    const distribution = {};
    if (q.type !== 'type_answer') {
      q.options.forEach((o) => {
        distribution[o.id] = 0;
      });
    }

    let correctCount = 0;
    let totalResponseMs = 0;
    let answeredCount = 0;

    for (const p of game.players.values()) {
      const ans = p.answers[qIdx];
      if (!ans) continue;
      answeredCount++;
      totalResponseMs += ans.responseTimeMs;
      if (ans.isCorrect) correctCount++;
      if (q.type !== 'type_answer' && ans.optionId && distribution[ans.optionId] !== undefined) {
        distribution[ans.optionId] += 1;
      }
    }

    const stat = {
      questionIndex: qIdx,
      text: q.text,
      type: q.type,
      correctCount,
      answeredCount,
      totalPlayers: game.players.size,
      accuracy: game.players.size > 0 ? Math.round((correctCount / game.players.size) * 100) : 0,
      avgResponseMs: answeredCount > 0 ? Math.round(totalResponseMs / answeredCount) : 0,
      distribution,
    };
    game.questionStats.push(stat);

    // Emit host result
    this.io.to(`host:${game.pin}`).emit('game:question-result', {
      state: 'QUESTION_RESULT',
      questionIndex: qIdx,
      totalQuestions: game.questions.length,
      question: q,
      distribution,
      correctCount,
      answeredCount,
      totalPlayers: game.players.size,
    });

    // Emit personalized feedback to each player
    const ranked = this.getRankedPlayers(game);
    ranked.forEach((p, idx) => {
      if (!p.socketId) return;
      const ans = p.answers[qIdx];
      const above = idx > 0 ? ranked[idx - 1] : null;
      this.io.to(p.socketId).emit('player:question-result', {
        state: 'QUESTION_RESULT',
        isCorrect: Boolean(ans?.isCorrect),
        timedOut: !ans,
        pointsEarned: ans?.pointsEarned || 0,
        streakBonus: ans?.streakBonus || 0,
        streak: p.streak,
        totalScore: p.score,
        rank: idx + 1,
        totalPlayers: ranked.length,
        behindPlayer: above ? { nickname: above.nickname, diff: above.score - p.score } : null,
        correctAnswers:
          q.type === 'type_answer'
            ? q.acceptedAnswers
            : q.options.filter((o) => o.isCorrect).map((o) => o.text),
      });
    });

    if (game.settings.autoAdvance) {
      game.timerHandle = setTimeout(() => {
        this.advanceGame(game);
      }, 4500);
    }
  }

  handleHostNext(socket) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return;
    const game = this.games.get(meta.pin);
    if (!game) return;
    this.advanceGame(game);
  }

  advanceGame(game) {
    this.clearTimers(game);

    if (game.state === 'QUESTION_RESULT') {
      const isLast = game.currentQuestionIndex >= game.questions.length - 1;
      if (isLast) {
        this.showPodium(game);
      } else {
        this.showLeaderboard(game);
      }
      return;
    }

    if (game.state === 'LEADERBOARD') {
      game.currentQuestionIndex += 1;
      if (game.currentQuestionIndex >= game.questions.length) {
        this.showPodium(game);
      } else {
        this.startGetReady(game);
      }
    }
  }

  showLeaderboard(game) {
    game.state = 'LEADERBOARD';
    const ranked = this.getRankedPlayers(game).map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      lastPoints: p.lastPoints,
      streak: p.streak,
    }));

    this.io.to(`game:${game.pin}`).emit('game:leaderboard', {
      state: 'LEADERBOARD',
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      leaderboard: ranked.slice(0, 8),
    });

    if (game.settings.autoAdvance) {
      game.timerHandle = setTimeout(() => {
        this.advanceGame(game);
      }, 4000);
    }
  }

  showPodium(game) {
    this.clearTimers(game);
    game.state = 'PODIUM';
    const endedAt = new Date().toISOString();

    const ranked = this.getRankedPlayers(game).map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      correctCount: p.correctCount,
      maxStreak: p.maxStreak,
      isBot: p.isBot,
    }));

    // Persist report to SQLite
    const reportId = crypto.randomUUID();
    game.reportId = reportId;
    const summary = {
      players: ranked,
      questions: game.questionStats,
    };

    try {
      db.prepare(
        `INSERT INTO game_reports (id, quiz_id, quiz_title, host_user_id, pin, started_at, ended_at, player_count, question_count, summary_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        reportId,
        game.quiz.id,
        game.quiz.title,
        game.hostUserId,
        game.pin,
        game.startedAt || endedAt,
        endedAt,
        ranked.length,
        game.questions.length,
        JSON.stringify(summary)
      );
    } catch (err) {
      console.error('Failed to save game report:', err);
    }

    this.io.to(`game:${game.pin}`).emit('game:podium', {
      state: 'PODIUM',
      quizTitle: game.quiz.title,
      reportId,
      totalQuestions: game.questions.length,
      standings: ranked,
    });
  }

  handleHostEnd(socket) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta || meta.role !== 'host') return;
    const game = this.games.get(meta.pin);
    if (!game) return;

    this.clearTimers(game);
    this.io.to(`game:${game.pin}`).emit('game:ended', {
      reason: 'Host telah mengakhiri permainan.',
    });
    this.games.delete(game.pin);
    this.socketToGame.delete(socket.id);
  }

  handleDisconnect(socket) {
    const meta = this.socketToGame.get(socket.id);
    if (!meta) return;
    this.socketToGame.delete(socket.id);

    const game = this.games.get(meta.pin);
    if (!game) return;

    if (meta.role === 'host') {
      // Give brief grace or end if still in lobby
      this.clearTimers(game);
      this.io.to(`game:${game.pin}`).emit('game:ended', {
        reason: 'Koneksi Host terputus. Permainan diakhiri.',
      });
      this.games.delete(game.pin);
    } else if (meta.role === 'player') {
      const player = game.players.get(meta.playerId);
      if (player) {
        player.connected = false;
        player.socketId = null;
        this.emitLobbyPlayers(game);
      }
    }
  }
}
