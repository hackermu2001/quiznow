import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Users,
  Play,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Bot,
  SkipForward,
  Check,
  Flame,
  Trophy,
  Copy,
  Settings,
  X,
  BarChart3,
  Home,
} from 'lucide-react';
import { getSocket } from '../utils/socket';
import { getStoredToken } from '../utils/api';
import { sound } from '../utils/sound';
import { ANSWER_STYLES, AnswerShape } from '../components/AnswerShape';
import QRCodeBox from '../components/QRCodeBox';

export default function HostGamePage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [pin, setPin] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [state, setState] = useState('LOADING'); // LOADING | LOBBY | GET_READY | QUESTION | QUESTION_RESULT | LEADERBOARD | PODIUM | ERROR
  const [error, setError] = useState('');
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({
    randomizeQuestions: false,
    randomizeAnswers: false,
    lockLobby: false,
    autoAdvance: false,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live game state
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [readyInfo, setReadyInfo] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [podiumData, setPodiumData] = useState(null);

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onLobbyPlayers = ({ players: list }) => {
      setPlayers((prev) => {
        if (list.length > prev.length) sound.playJoin();
        return list;
      });
      setTotalPlayers(list.length);
    };

    const onSettingsUpdated = (next) => setSettings(next);

    const onGetReady = (data) => {
      sound.stopLobbyMusic();
      clearInterval(timerIntervalRef.current);
      setState('GET_READY');
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setReadyInfo(data);
      sound.playTick(false);
    };

    const onQuestion = (data) => {
      clearInterval(timerIntervalRef.current);
      setState('QUESTION');
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.question);
      setAnsweredCount(0);
      setTotalPlayers(data.totalPlayers);

      const endAt = Date.now() + data.durationMs;
      setTimeLeft(Math.ceil(data.durationMs / 1000));

      timerIntervalRef.current = setInterval(() => {
        const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        setTimeLeft(rem);
        if (rem > 0 && rem <= 5) sound.playTick(true);
        if (rem <= 0) clearInterval(timerIntervalRef.current);
      }, 250);
    };

    const onAnswerCount = ({ answeredCount: ac, totalPlayers: tp }) => {
      setAnsweredCount(ac);
      setTotalPlayers(tp);
      sound.playAnswerSubmit();
    };

    const onQuestionResult = (data) => {
      clearInterval(timerIntervalRef.current);
      setState('QUESTION_RESULT');
      setResultData(data);
      sound.playCorrect();
    };

    const onLeaderboard = (data) => {
      setState('LEADERBOARD');
      setLeaderboard(data.leaderboard || []);
    };

    const onPodium = (data) => {
      clearInterval(timerIntervalRef.current);
      setState('PODIUM');
      setPodiumData(data);
      sound.playPodium();
      confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 600);
    };

    socket.on('lobby:players', onLobbyPlayers);
    socket.on('host:settings-updated', onSettingsUpdated);
    socket.on('game:get-ready', onGetReady);
    socket.on('game:question', onQuestion);
    socket.on('game:answer-count', onAnswerCount);
    socket.on('game:question-result', onQuestionResult);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:podium', onPodium);

    socket.emit('host:create', { quizId, token: getStoredToken() }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'Gagal membuat ruang game.');
        setState('ERROR');
        return;
      }
      setPin(res.pin);
      setQuiz(res.quiz);
      setTotalQuestions(res.quiz.questionCount);
      setSettings(res.settings);
      setState('LOBBY');
    });

    return () => {
      clearInterval(timerIntervalRef.current);
      sound.stopLobbyMusic();
      socket.emit('host:end');
      socket.off('lobby:players', onLobbyPlayers);
      socket.off('host:settings-updated', onSettingsUpdated);
      socket.off('game:get-ready', onGetReady);
      socket.off('game:question', onQuestion);
      socket.off('game:answer-count', onAnswerCount);
      socket.off('game:question-result', onQuestionResult);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:podium', onPodium);
    };
  }, [quizId]);

  const joinUrl = `${window.location.origin}/join?pin=${pin}`;

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    if (!next && state === 'LOBBY') sound.startLobbyMusic();
  }

  function updateSetting(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    socketRef.current?.emit('host:update-settings', next);
  }

  function handleAddBots() {
    socketRef.current?.emit('host:add-bots', { count: 3 });
  }

  function handleStart() {
    socketRef.current?.emit('host:start', (res) => {
      if (!res?.ok) alert(res?.error || 'Tidak bisa memulai game.');
    });
  }

  function handleCopyLink() {
    navigator.clipboard?.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === 'LOADING') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="font-display font-bold text-xl">Menyiapkan ruang permainan...</p>
        </div>
      </div>
    );
  }

  if (state === 'ERROR') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="font-display font-black text-2xl text-red-600">Terjadi Kesalahan</h2>
          <p className="text-slate-600">{error}</p>
          <button
            onClick={() => navigate('/discover')}
            className="px-6 py-3 rounded-xl bg-[#46178f] text-white font-bold cursor-pointer"
          >
            Kembali ke Daftar Kuis
          </button>
        </div>
      </div>
    );
  }

  /* ==================== LOBBY ==================== */
  if (state === 'LOBBY') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col">
        {/* Top Join Banner */}
        <header className="bg-black/25 backdrop-blur border-b border-white/10 p-4 sm:p-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white text-slate-900 rounded-2xl p-4 sm:px-7 shadow-2xl">
              <div className="text-center sm:text-left">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Gabung di <span className="text-[#46178f]">{window.location.host}/join</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-display font-black text-4xl sm:text-5xl tracking-[0.15em] text-slate-900">
                    {pin}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    title="Salin link gabung"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="hidden sm:block border-l border-slate-200 pl-4">
                <QRCodeBox value={joinUrl} size={96} />
              </div>
            </div>

            <div className="text-center md:text-right space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-200">
                {quiz?.questionCount} Pertanyaan
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl">{quiz?.title}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 pt-1">
                <button
                  onClick={handleAddBots}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Bot className="w-4 h-4" />
                  + Tambah Bot Demo
                </button>
                <button
                  onClick={() => updateSetting('lockLobby', !settings.lockLobby)}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  {settings.lockLobby ? <Lock className="w-4 h-4 text-yellow-300" /> : <Unlock className="w-4 h-4" />}
                  {settings.lockLobby ? 'Terkunci' : 'Kunci'}
                </button>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  title="Pengaturan Game"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  title="Suara"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Drawer */}
        {showSettings && (
          <div className="bg-black/40 border-b border-white/10 px-6 py-4">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm font-bold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomizeQuestions}
                  onChange={(e) => updateSetting('randomizeQuestions', e.target.checked)}
                  className="w-4 h-4 accent-yellow-400"
                />
                Acak urutan soal
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomizeAnswers}
                  onChange={(e) => updateSetting('randomizeAnswers', e.target.checked)}
                  className="w-4 h-4 accent-yellow-400"
                />
                Acak urutan pilihan
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoAdvance}
                  onChange={(e) => updateSetting('autoAdvance', e.target.checked)}
                  className="w-4 h-4 accent-yellow-400"
                />
                Lanjut otomatis (Auto-advance)
              </label>
            </div>
          </div>
        )}

        {/* Lobby Players Area */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/30 font-display font-extrabold text-lg">
              <Users className="w-5 h-5 text-yellow-300" />
              {players.length} Pemain
            </div>

            <button
              onClick={handleStart}
              disabled={players.length === 0}
              className="px-8 py-3.5 rounded-xl bg-[#26890c] hover:bg-[#1f720a] disabled:opacity-45 text-white font-display font-black text-lg flex items-center gap-2 btn-3d cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              Mulai Game!
            </button>
          </div>

          {players.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="bg-black/25 backdrop-blur px-8 py-6 rounded-2xl border border-white/15 max-w-md space-y-3">
                <p className="font-display font-extrabold text-2xl">Menunggu pemain bergabung...</p>
                <p className="text-sm text-purple-100/80">
                  Minta peserta membuka <strong>{window.location.host}/join</strong> dan memasukkan
                  PIN <strong>{pin}</strong>, atau klik <strong>+ Tambah Bot Demo</strong> untuk
                  langsung mencoba!
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 content-start">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => socketRef.current?.emit('host:kick-player', { playerId: p.id })}
                  title="Klik untuk mengeluarkan pemain"
                  className="animate-pop-in group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-black/35 hover:bg-red-600/80 border border-white/15 font-display font-bold text-lg transition cursor-pointer"
                >
                  <span className="text-2xl leading-none">{p.avatar}</span>
                  <span className="group-hover:line-through">{p.nickname}</span>
                  {p.isBot && (
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/20">
                      BOT
                    </span>
                  )}
                  <X className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ==================== GET READY ==================== */
  if (state === 'GET_READY') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-pop-in space-y-5">
          <div className="inline-block px-5 py-2 rounded-full bg-white/15 font-display font-bold text-lg">
            Pertanyaan {questionIndex + 1} dari {totalQuestions}
          </div>
          <h1 className="font-display font-black text-5xl sm:text-6xl">Siap-siap!</h1>
          {readyInfo?.pointsMode === 'double' && (
            <div className="inline-block px-6 py-2.5 rounded-xl bg-yellow-400 text-slate-900 font-display font-black text-xl shadow-lg">
              ⚡ POIN GANDA (2x)!
            </div>
          )}
          <div className="pt-4">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 border-t-yellow-300 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  /* ==================== QUESTION ==================== */
  if (state === 'QUESTION' && currentQuestion) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        {/* Top Question Bar */}
        <header className="bg-white shadow-sm px-6 py-5 text-center relative">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              <span>
                Soal {questionIndex + 1} / {totalQuestions}
              </span>
              {currentQuestion.pointsMode === 'double' && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  ⚡ 2x Poin
                </span>
              )}
              <span>PIN: {pin}</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-4xl text-slate-900 leading-snug">
              {currentQuestion.text}
            </h2>
          </div>
        </header>

        {/* Center Timer + Media + Answer Count */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between gap-4 my-auto">
            {/* Countdown Circle */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center font-display font-black text-4xl sm:text-5xl text-white shadow-xl shrink-0 transition ${
                timeLeft <= 5 ? 'bg-[#e21b3c] animate-pulse-ring' : 'bg-[#46178f]'
              }`}
            >
              {timeLeft}
            </div>

            {/* Center Image or Badge */}
            <div className="flex-1 flex justify-center">
              {currentQuestion.imageUrl ? (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Media soal"
                  className="max-h-60 rounded-2xl shadow-lg object-contain bg-white p-2"
                />
              ) : (
                <div className="px-6 py-3 rounded-2xl bg-purple-100 text-[#46178f] font-display font-bold text-sm">
                  {currentQuestion.type === 'type_answer'
                    ? '⌨️ Pemain sedang mengetik jawaban di perangkat mereka...'
                    : '🎯 Pilih jawaban tercepat di perangkatmu!'}
                </div>
              )}
            </div>

            {/* Answer Counter + Skip */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white shadow-md border border-slate-200 flex flex-col items-center justify-center">
                <span className="font-display font-black text-3xl sm:text-4xl text-slate-900">
                  {answeredCount}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase">
                  / {totalPlayers} Jawab
                </span>
              </div>
              <button
                onClick={() => socketRef.current?.emit('host:skip-timer')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Lewati
              </button>
            </div>
          </div>

          {/* Options Grid */}
          {currentQuestion.type !== 'type_answer' && (
            <div className="grid sm:grid-cols-2 gap-4 pb-2">
              {currentQuestion.options.map((opt, idx) => {
                const style = ANSWER_STYLES[idx % 4];
                return (
                  <div
                    key={opt.id}
                    className={`${style.bg} text-white rounded-2xl p-5 sm:p-6 flex items-center gap-4 shadow-lg`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                      <AnswerShape index={idx} className="w-6 h-6" />
                    </div>
                    <span className="font-display font-extrabold text-xl sm:text-2xl leading-snug">
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ==================== QUESTION RESULT ==================== */
  if (state === 'QUESTION_RESULT' && resultData) {
    const q = resultData.question;
    const maxCount = Math.max(1, ...Object.values(resultData.distribution || {}));

    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-500">
            Soal {questionIndex + 1} / {totalQuestions}
          </div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 text-center flex-1">
            {q.text}
          </h2>
          <button
            onClick={() => socketRef.current?.emit('host:next')}
            className="px-6 py-2.5 rounded-xl bg-[#1368ce] hover:bg-[#0f57ad] text-white font-display font-extrabold btn-3d cursor-pointer"
          >
            Lanjut
          </button>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col justify-between gap-8">
          {q.type === 'type_answer' ? (
            <div className="bg-white rounded-2xl p-8 shadow-md text-center space-y-4 my-auto">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Jawaban Benar
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {q.acceptedAnswers.map((ans, idx) => (
                  <span
                    key={idx}
                    className="px-6 py-3 rounded-2xl bg-[#26890c] text-white font-display font-black text-2xl shadow-md"
                  >
                    ✓ {ans}
                  </span>
                ))}
              </div>
              <p className="text-slate-600 font-bold pt-2">
                {resultData.correctCount} dari {resultData.totalPlayers} pemain menjawab benar!
              </p>
            </div>
          ) : (
            <>
              {/* Bar Chart Distribution */}
              <div className="flex items-end justify-center gap-4 sm:gap-8 h-60 pt-8">
                {q.options.map((opt, idx) => {
                  const style = ANSWER_STYLES[idx % 4];
                  const count = resultData.distribution?.[opt.id] || 0;
                  const pct = Math.max(12, Math.round((count / maxCount) * 100));
                  return (
                    <div key={opt.id} className="flex flex-col items-center gap-2 w-24 sm:w-32 h-full justify-end">
                      <div className="flex items-center gap-1 font-display font-black text-xl text-slate-800">
                        {opt.isCorrect && <Check className="w-6 h-6 text-[#26890c] stroke-[3]" />}
                        {count}
                      </div>
                      <div
                        className={`w-full rounded-t-xl ${style.bg} transition-all duration-700 flex items-end justify-center pb-3 text-white shadow-md ${
                          opt.isCorrect ? 'opacity-100 ring-4 ring-[#26890c]/40' : 'opacity-45'
                        }`}
                        style={{ height: `${pct}%` }}
                      >
                        <AnswerShape index={idx} className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Answer Cards with Correct Highlight */}
              <div className="grid sm:grid-cols-2 gap-4">
                {q.options.map((opt, idx) => {
                  const style = ANSWER_STYLES[idx % 4];
                  return (
                    <div
                      key={opt.id}
                      className={`${style.bg} text-white rounded-2xl p-5 flex items-center justify-between gap-4 shadow-md transition ${
                        opt.isCorrect ? 'opacity-100 ring-4 ring-slate-900/20' : 'opacity-40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AnswerShape index={idx} className="w-6 h-6 shrink-0" />
                        <span className="font-display font-extrabold text-lg sm:text-xl">
                          {opt.text}
                        </span>
                      </div>
                      {opt.isCorrect && (
                        <div className="w-9 h-9 rounded-full bg-white text-[#26890c] flex items-center justify-center shrink-0">
                          <Check className="w-6 h-6 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  /* ==================== LEADERBOARD ==================== */
  if (state === 'LEADERBOARD') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col">
        <header className="px-6 py-5 flex items-center justify-between max-w-4xl w-full mx-auto">
          <h1 className="font-display font-black text-3xl flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-300" />
            Papan Skor
          </h1>
          <button
            onClick={() => socketRef.current?.emit('host:next')}
            className="px-7 py-3 rounded-xl bg-white text-[#46178f] font-display font-black text-lg btn-3d cursor-pointer"
          >
            Soal Berikutnya
          </button>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 space-y-3">
          {leaderboard.map((p, idx) => (
            <div
              key={p.id}
              style={{ animationDelay: `${idx * 70}ms` }}
              className={`animate-slide-up flex items-center justify-between px-6 py-4 rounded-2xl shadow-lg ${
                idx === 0
                  ? 'bg-white text-slate-900 scale-[1.02]'
                  : 'bg-black/30 backdrop-blur border border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-lg ${
                    idx === 0 ? 'bg-yellow-400 text-slate-900' : 'bg-white/15'
                  }`}
                >
                  {p.rank}
                </span>
                <span className="text-3xl">{p.avatar}</span>
                <div>
                  <div className="font-display font-extrabold text-xl flex items-center gap-2">
                    {p.nickname}
                    {p.streak >= 2 && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-black">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {p.streak}
                      </span>
                    )}
                  </div>
                  {p.lastPoints > 0 && (
                    <span className="text-xs font-bold text-emerald-500">
                      +{p.lastPoints.toLocaleString()} poin
                    </span>
                  )}
                </div>
              </div>
              <div className="font-display font-black text-2xl">
                {p.score.toLocaleString()}
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  /* ==================== PODIUM ==================== */
  if (state === 'PODIUM' && podiumData) {
    const top = podiumData.standings || [];
    const first = top[0];
    const second = top[1];
    const third = top[2];

    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col">
        <header className="px-6 py-5 flex items-center justify-between max-w-6xl w-full mx-auto">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-purple-200">
              Podium Akhir
            </p>
            <h1 className="font-display font-black text-2xl sm:text-3xl">{podiumData.quizTitle}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            {podiumData.reportId && (
              <button
                onClick={() => navigate(`/reports/${podiumData.reportId}`)}
                className="px-4 py-2.5 rounded-xl bg-white text-[#46178f] font-extrabold text-sm flex items-center gap-2 btn-3d cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                Lihat Laporan
              </button>
            )}
            <button
              onClick={() => navigate('/discover')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Selesai
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col items-center justify-between gap-8">
          {/* Podium Bars */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-2xl pt-8">
            {/* 2nd Place */}
            <div className="flex-1 flex flex-col items-center">
              {second && (
                <div className="animate-slide-up text-center mb-3">
                  <div className="text-4xl mb-1">{second.avatar}</div>
                  <div className="font-display font-black text-lg sm:text-xl truncate max-w-[140px]">
                    {second.nickname}
                  </div>
                  <div className="text-sm font-bold text-purple-200">
                    {second.score.toLocaleString()} pts
                  </div>
                </div>
              )}
              <div className="w-full h-36 bg-slate-300 text-slate-900 rounded-t-2xl flex flex-col items-center justify-start pt-4 shadow-2xl">
                <span className="font-display font-black text-4xl">2</span>
                {second && (
                  <span className="text-xs font-bold mt-1">
                    {second.correctCount}/{podiumData.totalQuestions} benar
                  </span>
                )}
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex-1 flex flex-col items-center">
              {first && (
                <div className="animate-pop-in text-center mb-3">
                  <div className="text-5xl mb-1">👑 {first.avatar}</div>
                  <div className="font-display font-black text-xl sm:text-2xl truncate max-w-[160px] text-yellow-300">
                    {first.nickname}
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {first.score.toLocaleString()} pts
                  </div>
                </div>
              )}
              <div className="w-full h-52 bg-yellow-400 text-slate-900 rounded-t-2xl flex flex-col items-center justify-start pt-5 shadow-2xl">
                <span className="font-display font-black text-5xl">1</span>
                {first && (
                  <span className="text-xs font-extrabold mt-1">
                    {first.correctCount}/{podiumData.totalQuestions} benar
                  </span>
                )}
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex-1 flex flex-col items-center">
              {third && (
                <div className="animate-slide-up text-center mb-3">
                  <div className="text-4xl mb-1">{third.avatar}</div>
                  <div className="font-display font-black text-lg sm:text-xl truncate max-w-[140px]">
                    {third.nickname}
                  </div>
                  <div className="text-sm font-bold text-purple-200">
                    {third.score.toLocaleString()} pts
                  </div>
                </div>
              )}
              <div className="w-full h-28 bg-amber-600 text-white rounded-t-2xl flex flex-col items-center justify-start pt-4 shadow-2xl">
                <span className="font-display font-black text-4xl">3</span>
                {third && (
                  <span className="text-xs font-bold mt-1">
                    {third.correctCount}/{podiumData.totalQuestions} benar
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Remaining Players */}
          {top.length > 3 && (
            <div className="w-full max-w-2xl bg-black/25 backdrop-blur rounded-2xl p-4 space-y-2">
              {top.slice(3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 text-sm font-bold"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-purple-200">#{p.rank}</span>
                    <span>{p.avatar}</span>
                    <span>{p.nickname}</span>
                  </div>
                  <span>{p.score.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
