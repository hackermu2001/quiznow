import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const AVATARS = ['🦊', '🦁', '🐼', '🐸', '🦉', '🦄', '🚀', '⚡', '🤖', '🐙', '🐯', '🌟'];

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ username, email, password, avatar });
      }
      navigate('/discover');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setError('');
    setSubmitting(true);
    try {
      await login('demo@quiznow.id', 'demo123');
      navigate('/discover');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <h1 className="font-display font-black text-2xl text-slate-900">
              {mode === 'login' ? 'Masuk ke QuizNow!' : 'Buat Akun QuizNow!'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'login'
                ? 'Kelola kuis, host permainan, dan lihat laporan.'
                : 'Gratis! Mulai buat kuis interaktif pertamamu.'}
            </p>
          </div>

          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-[#46178f] shadow-xs' : 'text-slate-600'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-[#46178f] shadow-xs' : 'text-slate-600'
              }`}
            >
              Daftar
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Pilih Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={`h-10 rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${
                          avatar === a
                            ? 'bg-purple-100 ring-2 ring-[#46178f] scale-105'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="misal: GuruKeren"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#46178f] focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {mode === 'login' ? 'Email atau Username' : 'Email'}
              </label>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#46178f] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#46178f] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#46178f] hover:bg-[#381272] text-white font-display font-extrabold btn-3d cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              Masuk Cepat dengan Akun Demo (QuizMaster)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
