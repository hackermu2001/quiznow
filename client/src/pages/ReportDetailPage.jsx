import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Trophy, Users, Target, Flame } from 'lucide-react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../utils/api';

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/reports/${id}`)
      .then((data) => setReport(data.report))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navbar />
        <div className="max-w-5xl mx-auto p-8 text-center text-slate-500 font-bold">
          Memuat laporan...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navbar />
        <div className="max-w-5xl mx-auto p-8 text-center space-y-3">
          <p className="font-bold text-slate-700">Laporan tidak ditemukan.</p>
          <Link to="/reports" className="text-[#46178f] font-bold hover:underline">
            Kembali ke Daftar Laporan
          </Link>
        </div>
      </div>
    );
  }

  const players = report.summary?.players || [];
  const questions = report.summary?.questions || [];
  const avgAccuracy = questions.length
    ? Math.round(questions.reduce((acc, q) => acc + (q.accuracy || 0), 0) / questions.length)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Laporan
            </Link>
            <h1 className="font-display font-black text-3xl text-slate-900">{report.quiz_title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              PIN {report.pin} • Selesai {new Date(report.ended_at).toLocaleString('id-ID')}
            </p>
          </div>

          <a
            href={`/api/reports/${report.id}/csv`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#26890c] hover:bg-[#1f720a] text-white font-extrabold text-sm btn-3d self-start"
          >
            <Download className="w-4 h-4" />
            Unduh CSV
          </a>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-[#46178f] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Total Pemain</div>
              <div className="font-display font-black text-2xl text-slate-900">
                {report.player_count}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#26890c] flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Rata-rata Akurasi</div>
              <div className="font-display font-black text-2xl text-slate-900">{avgAccuracy}%</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Juara 1</div>
              <div className="font-display font-black text-xl text-slate-900 truncate max-w-[180px]">
                {players[0] ? `${players[0].avatar} ${players[0].nickname}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 font-display font-extrabold text-lg">
            Peringkat Pemain
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Pemain</th>
                  <th className="px-6 py-3">Benar</th>
                  <th className="px-6 py-3">Akurasi</th>
                  <th className="px-6 py-3">Streak Terbaik</th>
                  <th className="px-6 py-3 text-right">Total Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {players.map((p, idx) => {
                  const acc =
                    report.question_count > 0
                      ? Math.round((p.correctCount / report.question_count) * 100)
                      : 0;
                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 font-display font-black text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-xl">{p.avatar}</span>
                        {p.nickname}
                        {p.isBot && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            BOT
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 font-semibold">
                        {p.correctCount} / {report.question_count}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            acc >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : acc >= 40
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {acc}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-orange-600">
                        <span className="inline-flex items-center gap-1">
                          <Flame className="w-4 h-4" /> {p.maxStreak}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-display font-black text-slate-900">
                        {p.score.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-display font-extrabold text-lg text-slate-900">
            Analisis Per Pertanyaan
          </h2>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="font-bold text-slate-900">
                    {idx + 1}. {q.text}
                  </div>
                  <span className="text-sm font-display font-black text-[#46178f] shrink-0">
                    {q.accuracy}% benar
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      q.accuracy >= 70
                        ? 'bg-[#26890c]'
                        : q.accuracy >= 40
                        ? 'bg-[#d89e00]'
                        : 'bg-[#e21b3c]'
                    }`}
                    style={{ width: `${q.accuracy}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 font-semibold flex gap-4">
                  <span>
                    {q.correctCount} / {q.totalPlayers} pemain benar
                  </span>
                  <span>Rata-rata waktu jawab: {(q.avgResponseMs / 1000).toFixed(1)} detik</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
