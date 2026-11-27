import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Sparkles, Trophy, Zap, Users, BarChart3, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function HomePage() {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  function handleJoinSubmit(e) {
    e.preventDefault();
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);
    if (!cleaned) return;
    navigate(`/join?pin=${cleaned}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-kahoot-purple text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-bold text-purple-100">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              Platform Kuis Interaktif Real-Time
            </div>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-tight">
              Belajar &amp; Bermain Jadi Lebih <span className="text-yellow-300">Seru!</span>
            </h1>

            <p className="text-lg text-purple-100/90 max-w-xl leading-relaxed">
              Buat kuis interaktif dalam hitungan menit, bagikan PIN game ke peserta, dan lihat
              papan skor langsung bergerak secara real-time—persis seperti Kahoot!
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#26890c] hover:bg-[#1f720a] font-extrabold text-white btn-3d"
              >
                <Play className="w-5 h-5 fill-current" />
                Mainkan Kuis Sekarang
              </Link>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#46178f] hover:bg-purple-50 font-extrabold btn-3d"
              >
                Buat Kuis Sendiri
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Instant Join Card */}
          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-7 shadow-2xl border-4 border-white/20">
              <div className="text-center mb-6">
                <div className="inline-block font-display font-black text-3xl text-[#46178f] mb-1">
                  QuizNow<span className="text-[#e21b3c]">!</span>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  Punya PIN dari Host? Masukkan di sini untuk langsung bergabung!
                </p>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN Game (6 digit)"
                  className="w-full text-center font-display font-black text-2xl tracking-[0.25em] py-4 px-4 rounded-xl border-2 border-slate-300 focus:border-[#46178f] focus:outline-none placeholder:tracking-normal placeholder:text-lg placeholder:font-semibold placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={pin.length < 4}
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-display font-extrabold text-lg btn-3d cursor-pointer"
                >
                  Masuk ke Game
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                Ingin mencoba sendiri? Buka{' '}
                <Link to="/discover" className="text-[#46178f] font-bold hover:underline">
                  Jelajahi Kuis
                </Link>
                , klik <strong>Host Live</strong>, lalu tambahkan <strong>Bot Demo</strong>!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h2 className="font-display font-black text-3xl text-slate-900">
            Fitur Lengkap Seperti Kahoot
          </h2>
          <p className="text-slate-600 mt-2">
            Semua yang kamu butuhkan untuk kuis kelas, acara kantor, atau main bareng teman.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Zap,
              color: 'bg-[#e21b3c]',
              title: 'Real-Time WebSocket',
              desc: 'Sinkronisasi instan antara layar Host dan perangkat pemain dengan timer akurat.',
            },
            {
              icon: Trophy,
              color: 'bg-[#d89e00]',
              title: 'Skor Kecepatan & Streak',
              desc: 'Jawab lebih cepat dapat poin lebih tinggi, plus bonus Answer Streak hingga +500!',
            },
            {
              icon: Users,
              color: 'bg-[#1368ce]',
              title: '3 Tipe Pertanyaan',
              desc: 'Mendukung Pilihan Ganda, Benar/Salah, dan Ketik Jawaban dengan poin standar atau 2x.',
            },
            {
              icon: BarChart3,
              color: 'bg-[#26890c]',
              title: 'Laporan & Ekspor CSV',
              desc: 'Setiap sesi tersimpan otomatis lengkap dengan statistik akurasi soal dan unduh CSV.',
            },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition"
            >
              <div
                className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center mb-4 shadow-sm`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
