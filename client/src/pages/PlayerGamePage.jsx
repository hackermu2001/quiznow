import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Flame, Trophy, Clock, Send } from 'lucide-react';
import { getSocket } from '../utils/socket';
import { sound } from '../utils/sound';
import { ANSWER_STYLES, AnswerShape } from '../components/AnswerShape';

const AVATARS = ['🦊', '🦁', '🐼', '🐸', '🦉', '🦄', '🚀', '⚡', '🤖', '🐙', '🐯', '🌟'];

export default function PlayerGamePage() {
  const [searchParams] = useSearchParams();
  const initialPin = (searchParams.get('pin') || '').replace(/\D/g, '').slice(0, 6);

  const [step, setStep] = useState(initialPin.length === 6 ? 'NICKNAME' : 'PIN');
  // PIN | NICKNAME | LOBBY | GET_READY | QUESTION | ANSWERED | RESULT | LEADERBOARD | PODIUM | ENDED
  const [pin, setPin] = useState(initialPin);
  const [quizTitle, setQuizTitle] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [error, setError] = useState('');
  const [player, setPlayer] = useState(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [podium, setPodium] = useState(null);
  const [endReason, setEndReason] = useState('');

  const timerRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    // Auto-check PIN if came from ?pin=
    if (initialPin.length === 6) {
      const saved = sessionStorage.getItem(`quiznow_player_${initialPin}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          socket.emit(
            'player:join',
            { pin: initialPin, nickname: parsed.nickname, avatar: parsed.avatar, playerToken: parsed.token },
            (res) => {
              if (res?.ok) {
                setPlayer(res.player);
                setQuizTitle(res.gameState.quizTitle);
                syncFromState(res.gameState);
              }
            }
          );
        } catch {}
      } else {
        socket.emit('player:check-pin', { pin: initialPin }, (res) => {
          if (res?.ok) {
            setQuizTitle(res.quizTitle);
            setStep('NICKNAME');
          } else {
            setError(res?.error || 'PIN tidak valid.');
            setStep('PIN');
          }
        });
      }
    }

    const onGetReady = (data) => {
      clearInterval(timerRef.current);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setResult(null);
      setTypedAnswer('');
      setStep('GET_READY');
    };

    const onQuestion = (data) => {
      clearInterval(timerRef.current);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setQuestion(data.question);
      setTypedAnswer('');
      setStep('QUESTION');

      const endAt = Date.now() + data.durationMs;
      setTimeLeft(Math.ceil(data.durationMs / 1000));
      timerRef.current = setInterval(() => {
        const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        setTimeLeft(rem);
        if (rem <= 0) clearInterval(timerRef.current);
      }, 250);
    };

    const onPlayerResult = (data) => {
      clearInterval(timerRef.current);
      setResult(data);
      setPlayer((prev) => (prev ? { ...prev, score: data.totalScore } : prev));
      setStep('RESULT');
      if (data.isCorrect) sound.playCorrect();
      else sound.playWrong();
    };

    const onLeaderboard = (data) => {
      setLeaderboard(data.leaderboard || []);
      setStep('LEADERBOARD');
    };

    const onPodium = (data) => {
      clearInterval(timerRef.current);
      setPodium(data);
      setStep('PODIUM');
      sound.playPodium();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    };

    const onKicked = ({ reason }) => {
      setEndReason(reason || 'Kamu dikeluarkan dari game.');
      setStep('ENDED');
    };

    const onEnded = ({ reason }) => {
      setEndReason(reason || 'Permainan telah berakhir.');
      setStep('ENDED');
    };

    socket.on('game:get-ready', onGetReady);
    socket.on('game:question', onQuestion);
    socket.on('player:question-result', onPlayerResult);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:podium', onPodium);
    socket.on('player:kicked', onKicked);
    socket.on('game:ended', onEnded);

    return () => {
      clearInterval(timerRef.current);
      socket.off('game:get-ready', onGetReady);
      socket.off('game:question', onQuestion);
      socket.off('player:question-result', onPlayerResult);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:podium', onPodium);
      socket.off('player:kicked', onKicked);
      socket.off('game:ended', onEnded);
    };
  }, [initialPin]);

  function syncFromState(gs) {
    setQuestionIndex(gs.questionIndex || 0);
    setTotalQuestions(gs.totalQuestions || 0);
    if (gs.state === 'LOBBY') setStep('LOBBY');
    else if (gs.state === 'GET_READY') setStep('GET_READY');
    else if (gs.state === 'QUESTION') {
      setQuestion(gs.question);
      setStep(gs.answered ? 'ANSWERED' : 'QUESTION');
    } else if (gs.state === 'LEADERBOARD') setStep('LEADERBOARD');
    else setStep('LOBBY');
  }

  function handleCheckPin(e) {
    e.preventDefault();
    setError('');
    const socket = getSocket();
    socket.emit('player:check-pin', { pin }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'PIN tidak ditemukan.');
        return;
      }
      setQuizTitle(res.quizTitle);
      setStep('NICKNAME');
    });
  }

  function handleJoin(e) {
    e.preventDefault();
    setError('');
    const socket = getSocket();
    socket.emit('player:join', { pin, nickname, avatar }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'Gagal bergabung.');
        return;
      }
      setPlayer(res.player);
      sessionStorage.setItem(`quiznow_player_${pin}`, JSON.stringify(res.player));
      sound.playJoin();
      syncFromState(res.gameState);
    });
  }

  function submitOption(optionId) {
    const socket = getSocket();
    socket.emit('player:answer', { optionId }, (res) => {
      if (res?.ok) {
        sound.playAnswerSubmit();
        setStep('ANSWERED');
      }
    });
  }

  function submitTextAnswer(e) {
    e.preventDefault();
    if (!typedAnswer.trim()) return;
    const socket = getSocket();
    socket.emit('player:answer', { answerText: typedAnswer }, (res) => {
      if (res?.ok) {
        sound.playAnswerSubmit();
        setStep('ANSWERED');
      }
    });
  }

  /* ==================== PIN ENTRY ==================== */
  if (step === 'PIN') {
    return (
      <div className="min-h-screen bg-kahoot-purple flex flex-col items-center justify-center p-4">
        <Link to="/" className="font-display font-black text-4xl text-white mb-8">
          QuizNow<span className="text-yellow-300">!</span>
        </Link>

        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleCheckPin} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN Game"
              className="w-full text-center font-display font-black text-2xl tracking-[0.2em] py-4 px-4 rounded-xl border-2 border-slate-300 focus:border-[#46178f] focus:outline-none placeholder:tracking-normal placeholder:text-lg"
            />
            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-display font-extrabold text-lg btn-3d cursor-pointer"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ==================== NICKNAME & AVATAR ==================== */
  if (step === 'NICKNAME') {
    return (
      <div className="min-h-screen bg-kahoot-purple flex flex-col items-center justify-center p-4">
        <div className="text-center text-white mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-200">
            PIN: {pin}
          </div>
          <h1 className="font-display font-black text-2xl mt-1">{quizTitle || 'Gabung Game'}</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 text-center mb-2">
              Pilih Avatarmu
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`h-11 rounded-xl text-2xl flex items-center justify-center transition cursor-pointer ${
                    avatar === a
                      ? 'bg-purple-100 ring-2 ring-[#46178f] scale-110'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              maxLength={20}
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Masukkan Nickname"
              className="w-full text-center font-display font-bold text-xl py-3.5 px-4 rounded-xl border-2 border-slate-300 focus:border-[#46178f] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!nickname.trim()}
              className="w-full py-4 rounded-xl bg-[#26890c] hover:bg-[#1f720a] disabled:opacity-50 text-white font-display font-extrabold text-lg btn-3d cursor-pointer"
            >
              OK, Mulai!
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ==================== WAITING IN LOBBY ==================== */
  if (step === 'LOBBY') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-pop-in space-y-5 max-w-md">
          <div className="text-7xl">{player?.avatar}</div>
          <h1 className="font-display font-black text-3xl sm:text-4xl">Kamu sudah masuk!</h1>
          <div className="inline-block px-6 py-2.5 rounded-2xl bg-black/30 font-display font-extrabold text-2xl">
            {player?.nickname}
          </div>
          <p className="text-purple-200 font-semibold">
            Lihat namamu di layar Host? Menunggu Host memulai permainan...
          </p>
        </div>
      </div>
    );
  }

  /* ==================== GET READY ==================== */
  if (step === 'GET_READY') {
    return (
      <div className="min-h-screen bg-kahoot-purple text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-pop-in space-y-4">
          <div className="text-sm font-bold uppercase tracking-wider text-purple-200">
            Soal {questionIndex + 1} dari {totalQuestions}
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl">Siap-siap!</h1>
          <div className="w-16 h-16 border-4 border-white/30 border-t-yellow-300 rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  /* ==================== ACTIVE QUESTION ==================== */
  if (step === 'QUESTION' && question) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <header className="bg-white px-4 py-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-slate-700">
            <span className="text-xl">{player?.avatar}</span>
            <span>{player?.nickname}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-display font-black text-sm ${
              timeLeft <= 5 ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-[#46178f]'
            }`}
          >
            <Clock className="w-4 h-4" />
            {timeLeft}d
          </div>
          <div className="px-3 py-1 rounded-lg bg-slate-900 text-white font-display font-extrabold text-sm">
            {(player?.score || 0).toLocaleString()}
          </div>
        </header>

        <div className="px-4 py-4 bg-white border-t border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">
            Soal {questionIndex + 1} / {totalQuestions}
          </p>
          <h2 className="font-display font-extrabold text-lg sm:text-2xl text-slate-900">
            {question.text}
          </h2>
        </div>

        <main className="flex-1 p-4 flex flex-col justify-center">
          {question.type === 'type_answer' ? (
            <form
              onSubmit={submitTextAnswer}
              className="max-w-lg w-full mx-auto bg-white rounded-2xl p-6 shadow-lg space-y-4"
            >
              <input
                type="text"
                autoFocus
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Ketik jawabanmu di sini..."
                className="w-full text-center font-display font-bold text-xl py-4 px-4 rounded-xl border-2 border-slate-300 focus:border-[#46178f] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!typedAnswer.trim()}
                className="w-full py-4 rounded-xl bg-[#46178f] hover:bg-[#381272] disabled:opacity-50 text-white font-display font-extrabold text-lg flex items-center justify-center gap-2 btn-3d cursor-pointer"
              >
                <Send className="w-5 h-5" />
                Kirim Jawaban
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-4xl w-full mx-auto">
              {question.options.map((opt, idx) => {
                const style = ANSWER_STYLES[idx % 4];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => submitOption(opt.id)}
                    className={`${style.bg} ${style.hover} text-white rounded-2xl p-6 flex items-center gap-4 text-left btn-3d cursor-pointer min-h-[110px]`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                      <AnswerShape index={idx} className="w-7 h-7" />
                    </div>
                    <span className="font-display font-extrabold text-xl sm:text-2xl leading-snug">
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ==================== ANSWERED WAITING ==================== */
  if (step === 'ANSWERED') {
    return (
      <div className="min-h-screen bg-kahoot-purple text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-pop-in space-y-4">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <h1 className="font-display font-black text-3xl">Jawaban Terkirim!</h1>
          <p className="text-purple-200 font-semibold">
            Apakah kamu cukup cepat dan tepat? Menunggu pemain lain...
          </p>
        </div>
      </div>
    );
  }

  /* ==================== QUESTION RESULT FEEDBACK ==================== */
  if (step === 'RESULT' && result) {
    return (
      <div
        className={`min-h-screen text-white flex flex-col items-center justify-center p-6 text-center ${
          result.isCorrect ? 'bg-[#26890c]' : 'bg-[#e21b3c]'
        }`}
      >
        <div className="animate-pop-in max-w-md w-full space-y-5">
          {result.isCorrect ? (
            <CheckCircle2 className="w-24 h-24 mx-auto stroke-[2.5]" />
          ) : (
            <XCircle className="w-24 h-24 mx-auto stroke-[2.5]" />
          )}

          <h1 className="font-display font-black text-4xl">
            {result.isCorrect ? 'BENAR!' : result.timedOut ? 'WAKTU HABIS!' : 'KURANG TEPAT!'}
          </h1>

          {result.isCorrect ? (
            <div className="inline-block px-7 py-3 rounded-2xl bg-black/25 font-display font-black text-3xl">
              +{result.pointsEarned.toLocaleString()}
            </div>
          ) : (
            <div className="bg-black/20 rounded-2xl p-4 text-sm font-bold">
              Jawaban benar:{' '}
              <span className="underline">{(result.correctAnswers || []).join(', ')}</span>
            </div>
          )}

          {result.streak >= 2 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 font-display font-extrabold text-sm shadow-lg">
              <Flame className="w-4 h-4 fill-current" />
              Answer Streak {result.streak}! (+{result.streakBonus} bonus)
            </div>
          )}

          <div className="pt-4 border-t border-white/20 space-y-1">
            <p className="font-display font-extrabold text-xl">
              Peringkat #{result.rank} dari {result.totalPlayers}
            </p>
            <p className="text-sm text-white/90 font-semibold">
              Total Skor: {result.totalScore.toLocaleString()}
            </p>
            {result.behindPlayer && result.behindPlayer.diff > 0 && (
              <p className="text-xs text-white/80">
                Kamu tertinggal {result.behindPlayer.diff.toLocaleString()} poin di belakang{' '}
                <strong>{result.behindPlayer.nickname}</strong>!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ==================== LEADERBOARD ==================== */
  if (step === 'LEADERBOARD') {
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5 text-center">
          <Trophy className="w-12 h-12 text-yellow-300 mx-auto" />
          <h1 className="font-display font-black text-3xl">Papan Skor Sementara</h1>
          <div className="space-y-2.5 text-left">
            {leaderboard.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold ${
                  p.id === player?.id
                    ? 'bg-yellow-400 text-slate-900'
                    : 'bg-black/30 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-display font-black">#{p.rank}</span>
                  <span>{p.avatar}</span>
                  <span>{p.nickname}</span>
                </div>
                <span className="font-display font-black">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-purple-200">Menunggu Host melanjutkan ke soal berikutnya...</p>
        </div>
      </div>
    );
  }

  /* ==================== PODIUM ==================== */
  if (step === 'PODIUM' && podium) {
    const me = (podium.standings || []).find((p) => p.id === player?.id);
    return (
      <div className="min-h-screen bg-kahoot-lobby text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-pop-in max-w-md w-full bg-black/30 backdrop-blur border border-white/15 rounded-3xl p-8 space-y-5">
          <div className="text-6xl">
            {me?.rank === 1 ? '🥇' : me?.rank === 2 ? '🥈' : me?.rank === 3 ? '🥉' : '🎉'}
          </div>
          <h1 className="font-display font-black text-3xl">Permainan Selesai!</h1>
          {me && (
            <div className="space-y-2">
              <div className="font-display font-black text-5xl text-yellow-300">
                Juara #{me.rank}
              </div>
              <p className="text-xl font-bold">{me.score.toLocaleString()} Poin</p>
              <p className="text-sm text-purple-200">
                {me.correctCount} dari {podium.totalQuestions} jawaban benar • Streak terbaik:{' '}
                {me.maxStreak}
              </p>
            </div>
          )}
          <div className="pt-4">
            <Link
              to="/"
              className="inline-block w-full py-3.5 rounded-xl bg-white text-[#46178f] font-display font-extrabold btn-3d"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ==================== ENDED / KICKED ==================== */
  return (
    <div className="min-h-screen bg-kahoot-purple text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white text-slate-900 rounded-2xl p-8 max-w-sm w-full space-y-4 shadow-2xl">
        <h2 className="font-display font-black text-2xl">Permainan Berakhir</h2>
        <p className="text-slate-600 text-sm font-medium">{endReason}</p>
        <Link
          to="/join"
          onClick={() => setStep('PIN')}
          className="inline-block w-full py-3 rounded-xl bg-[#46178f] text-white font-display font-bold"
        >
          Gabung Game Lain
        </Link>
      </div>
    </div>
  );
}
