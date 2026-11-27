import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, HelpCircle, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../utils/api';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/reports')
      .then((data) => setReports(data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Hapus laporan ini?')) return;
    await apiFetch(`/api/reports/${id}`, { method: 'DELETE' });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[#46178f]" />
            Laporan Permainan
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Riwayat sesi kuis yang telah selesai beserta peringkat dan analisis akurasi soal.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <p className="font-display font-bold text-lg text-slate-700">
              Belum ada laporan permainan.
            </p>
            <p className="text-sm text-slate-500">
              Mainkan satu sesi kuis hingga selesai (Podium) agar laporan otomatis tersimpan di sini!
            </p>
            <Link
              to="/discover"
              className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#46178f] text-white font-bold text-sm"
            >
              Jelajahi Kuis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-[#46178f] font-display font-bold text-xs">
                      PIN {r.pin}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.ended_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <h2 className="font-display font-extrabold text-lg text-slate-900">
                    {r.quiz_title}
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {r.player_count} Pemain
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" /> {r.question_count} Soal
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/reports/${r.id}`}
                    className="px-4 py-2.5 rounded-xl bg-[#1368ce] hover:bg-[#0f57ad] text-white font-bold text-sm flex items-center gap-1.5"
                  >
                    Detail
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                    title="Hapus laporan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
