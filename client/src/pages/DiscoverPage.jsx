import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Search, Edit3, Copy, Trash2, Plus, HelpCircle, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import UserAvatar from '../components/UserAvatar';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Semua', 'Pengetahuan Umum', 'Teknologi', 'Sains', 'Sejarah', 'Bahasa', 'Hiburan', 'Umum'];

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scope, setScope] = useState('discover');
  const [category, setCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadQuizzes() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ scope, q: search, category });
      const data = await apiFetch(`/api/quizzes?${params.toString()}`);
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuizzes();
  }, [scope, category]);

  async function handleDuplicate(quizId) {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const data = await apiFetch(`/api/quizzes/${quizId}/duplicate`, { method: 'POST' });
      navigate(`/edit/${data.quiz.id}`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(quizId) {
    if (!confirm('Yakin ingin menghapus kuis ini secara permanen?')) return;
    try {
      await apiFetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-black text-3xl text-slate-900">
              {scope === 'mine' ? 'Kuis Saya' : 'Jelajahi Kuis'}
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Pilih kuis untuk langsung di-host secara live atau duplikasi untuk diedit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setScope('discover')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                  scope === 'discover' ? 'bg-[#46178f] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Publik
              </button>
              <button
                onClick={() => {
                  if (!user) return navigate('/auth');
                  setScope('mine');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                  scope === 'mine' ? 'bg-[#46178f] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kuis Saya
              </button>
            </div>
          </div>
        </div>

        {/* Search + Category Pills */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 mb-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadQuizzes();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul atau deskripsi kuis..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#46178f] focus:outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#46178f] hover:bg-[#381272] text-white font-bold text-sm cursor-pointer"
            >
              Cari
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  category === cat
                    ? 'bg-[#46178f] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-500 font-semibold mb-4">Belum ada kuis yang cocok.</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1368ce] text-white font-bold btn-3d"
            >
              <Plus className="w-4 h-4" />
              Buat Kuis Baru
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((qz) => {
              const isOwner = user && user.id === qz.user_id;
              return (
                <div
                  key={qz.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg transition flex flex-col"
                >
                  <div
                    className="h-32 p-5 flex flex-col justify-between text-white relative"
                    style={{ backgroundColor: qz.cover_color || '#46178f' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-black/25 backdrop-blur text-xs font-bold">
                        {qz.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-black/25 backdrop-blur text-xs font-bold flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {qz.question_count} Soal
                      </span>
                    </div>
                    <h3 className="font-display font-black text-xl leading-snug line-clamp-2 drop-shadow-xs">
                      {qz.title}
                    </h3>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
                        {qz.description || 'Tidak ada deskripsi.'}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <UserAvatar avatar={qz.author_avatar} size="sm" />
                          {qz.author_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {qz.play_count}x dimainkan
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/host/${qz.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#26890c] hover:bg-[#1f720a] text-white font-extrabold text-sm btn-3d cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Host Live
                      </button>

                      {isOwner ? (
                        <>
                          <Link
                            to={`/edit/${qz.id}`}
                            title="Edit Kuis"
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(qz.id)}
                            title="Hapus Kuis"
                            className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDuplicate(qz.id)}
                          title="Duplikasi & Edit"
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
