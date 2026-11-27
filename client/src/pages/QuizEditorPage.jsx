import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Check,
  Clock,
  Award,
  Image as ImageIcon,
  ArrowLeft,
  Settings2,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ANSWER_STYLES, AnswerShape } from '../components/AnswerShape';

const COVER_COLORS = ['#46178f', '#e21b3c', '#1368ce', '#26890c', '#d89e00', '#0f766e', '#db2777'];
const CATEGORIES = ['Pengetahuan Umum', 'Teknologi', 'Sains', 'Sejarah', 'Bahasa', 'Hiburan', 'Umum'];
const TIME_OPTIONS = [5, 10, 15, 20, 30, 60, 90, 120];

function createEmptyQuestion(type = 'quiz') {
  if (type === 'true_false') {
    return {
      id: crypto.randomUUID(),
      type: 'true_false',
      text: '',
      imageUrl: '',
      timeLimit: 15,
      pointsMode: 'standard',
      options: [
        { id: 'true', text: 'Benar', isCorrect: true },
        { id: 'false', text: 'Salah', isCorrect: false },
      ],
      acceptedAnswers: [],
    };
  }
  if (type === 'type_answer') {
    return {
      id: crypto.randomUUID(),
      type: 'type_answer',
      text: '',
      imageUrl: '',
      timeLimit: 30,
      pointsMode: 'standard',
      options: [],
      acceptedAnswers: [''],
    };
  }
  return {
    id: crypto.randomUUID(),
    type: 'quiz',
    text: '',
    imageUrl: '',
    timeLimit: 20,
    pointsMode: 'standard',
    options: [
      { id: 'a', text: '', isCorrect: true },
      { id: 'b', text: '', isCorrect: false },
      { id: 'c', text: '', isCorrect: false },
      { id: 'd', text: '', isCorrect: false },
    ],
    acceptedAnswers: [],
  };
}

export default function QuizEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState('#46178f');
  const [category, setCategory] = useState('Umum');
  const [isPublic, setIsPublic] = useState(true);
  const [questions, setQuestions] = useState([createEmptyQuestion('quiz')]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!isEditing) return;
    apiFetch(`/api/quizzes/${id}`)
      .then((data) => {
        const qz = data.quiz;
        setTitle(qz.title);
        setDescription(qz.description || '');
        setCoverColor(qz.cover_color || '#46178f');
        setCategory(qz.category || 'Umum');
        setIsPublic(qz.is_public);
        setQuestions(
          qz.questions.length ? qz.questions : [createEmptyQuestion('quiz')]
        );
      })
      .catch((err) => setError(err.message));
  }, [id, isEditing]);

  const current = questions[activeIdx] || questions[0];

  function updateCurrent(patch) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeIdx ? { ...q, ...patch } : q))
    );
  }

  function changeQuestionType(newType) {
    const template = createEmptyQuestion(newType);
    updateCurrent({
      type: newType,
      options: template.options,
      acceptedAnswers: template.acceptedAnswers,
    });
  }

  function addQuestion(type = 'quiz') {
    const next = [...questions, createEmptyQuestion(type)];
    setQuestions(next);
    setActiveIdx(next.length - 1);
  }

  function duplicateQuestion(idx) {
    const copy = structuredClone(questions[idx]);
    copy.id = crypto.randomUUID();
    const next = [...questions.slice(0, idx + 1), copy, ...questions.slice(idx + 1)];
    setQuestions(next);
    setActiveIdx(idx + 1);
  }

  function deleteQuestion(idx) {
    if (questions.length <= 1) return;
    const next = questions.filter((_, i) => i !== idx);
    setQuestions(next);
    setActiveIdx(Math.max(0, Math.min(activeIdx, next.length - 1)));
  }

  async function handleSave() {
    setError('');
    if (!title.trim()) {
      setShowSettings(true);
      setError('Judul kuis wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        cover_color: coverColor,
        category,
        is_public: isPublic,
        questions,
      };
      if (isEditing) {
        await apiFetch(`/api/quizzes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/quizzes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/discover');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#f2f2f2] overflow-hidden">
      {/* Top Editor Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/discover')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masukkan judul kuis..."
            className="font-display font-bold text-lg text-slate-900 bg-slate-100 hover:bg-slate-200/70 focus:bg-white px-3.5 py-1.5 rounded-xl border border-transparent focus:border-[#46178f] focus:outline-none w-56 sm:w-80"
          />
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Pengaturan</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="hidden md:inline text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#26890c] hover:bg-[#1f720a] text-white font-extrabold text-sm btn-3d cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Kuis'}
          </button>
        </div>
      </header>

      {error && (
        <div className="md:hidden bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold px-4 py-2">
          {error}
        </div>
      )}

      {/* 3-Column Kahoot Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Question Slides */}
        <aside className="w-52 sm:w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                onClick={() => setActiveIdx(idx)}
                className={`p-2.5 rounded-xl border-2 cursor-pointer transition group ${
                  idx === activeIdx
                    ? 'border-[#46178f] bg-purple-50/70'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                  <span>
                    {idx + 1}.{' '}
                    {q.type === 'true_false'
                      ? 'Benar/Salah'
                      : q.type === 'type_answer'
                      ? 'Ketik'
                      : 'Kuis'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(idx);
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                      title="Duplikasi"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteQuestion(idx);
                        }}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2 min-h-[2rem]">
                  {q.text || 'Pertanyaan kosong...'}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span>{q.timeLimit}d</span>
                  <span>
                    {q.pointsMode === 'double'
                      ? '2x Poin'
                      : q.pointsMode === 'none'
                      ? '0 Poin'
                      : 'Standar'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => addQuestion('quiz')}
              className="w-full py-2.5 rounded-xl bg-[#1368ce] hover:bg-[#0f57ad] text-white font-extrabold text-sm flex items-center justify-center gap-1.5 btn-3d cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Soal
            </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-6">
            {/* Question Text Input */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <textarea
                rows={2}
                value={current.text}
                onChange={(e) => updateCurrent({ text: e.target.value })}
                placeholder="Ketik pertanyaanmu di sini..."
                className="w-full text-center font-display font-bold text-xl sm:text-2xl text-slate-900 resize-none focus:outline-none placeholder:text-slate-300"
              />
            </div>

            {/* Optional Image URL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={current.imageUrl || ''}
                  onChange={(e) => updateCurrent({ imageUrl: e.target.value })}
                  placeholder="URL Gambar opsional (https://...)"
                  className="flex-1 text-sm text-slate-700 focus:outline-none"
                />
              </div>
              {current.imageUrl && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={current.imageUrl}
                    alt="Preview"
                    className="max-h-48 rounded-xl object-contain border border-slate-100"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Answers Area */}
            {current.type === 'type_answer' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-slate-800">
                    Jawaban Benar yang Diterima (tidak peka huruf besar/kecil)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrent({
                        acceptedAnswers: [...(current.acceptedAnswers || []), ''],
                      })
                    }
                    className="text-xs font-bold text-[#1368ce] hover:underline cursor-pointer"
                  >
                    + Tambah Alternatif
                  </button>
                </div>

                {(current.acceptedAnswers || ['']).map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => {
                        const next = [...current.acceptedAnswers];
                        next[idx] = e.target.value;
                        updateCurrent({ acceptedAnswers: next });
                      }}
                      placeholder={`Jawaban diterima #${idx + 1}`}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#26890c] focus:outline-none font-bold"
                    />
                    {current.acceptedAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrent({
                            acceptedAnswers: current.acceptedAnswers.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {(current.options || []).map((opt, idx) => {
                  const style = ANSWER_STYLES[idx % 4];
                  return (
                    <div
                      key={opt.id}
                      className={`rounded-2xl p-3 flex items-center gap-3 shadow-sm border-2 transition ${
                        opt.text ? `${style.bg} text-white border-transparent` : 'bg-white border-slate-200'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          opt.text ? 'bg-black/20 text-white' : `${style.bg} text-white`
                        }`}
                      >
                        <AnswerShape index={idx} className="w-5 h-5" />
                      </div>

                      <input
                        type="text"
                        disabled={current.type === 'true_false'}
                        value={opt.text}
                        onChange={(e) => {
                          const next = current.options.map((o, i) =>
                            i === idx ? { ...o, text: e.target.value } : o
                          );
                          updateCurrent({ options: next });
                        }}
                        placeholder={`Tambahkan jawaban ${idx + 1}`}
                        className={`flex-1 bg-transparent font-bold text-base focus:outline-none ${
                          opt.text
                            ? 'text-white placeholder:text-white/70'
                            : 'text-slate-800 placeholder:text-slate-400'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const next = current.options.map((o, i) => {
                            if (current.type === 'true_false') {
                              return { ...o, isCorrect: i === idx };
                            }
                            return i === idx ? { ...o, isCorrect: !o.isCorrect } : o;
                          });
                          updateCurrent({ options: next });
                        }}
                        title="Tandai sebagai jawaban benar"
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
                          opt.isCorrect
                            ? 'bg-[#26890c] border-white text-white shadow-md scale-105'
                            : opt.text
                            ? 'border-white/70 bg-black/15 text-transparent hover:bg-black/25'
                            : 'border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Question Settings */}
        <aside className="hidden lg:flex w-64 bg-white border-l border-slate-200 p-4 flex-col gap-5 shrink-0">
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
              Tipe Pertanyaan
            </label>
            <select
              value={current.type}
              onChange={(e) => changeQuestionType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:border-[#46178f] focus:outline-none"
            >
              <option value="quiz">Pilihan Ganda (Quiz)</option>
              <option value="true_false">Benar / Salah</option>
              <option value="type_answer">Ketik Jawaban</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" /> Batas Waktu
            </label>
            <select
              value={current.timeLimit}
              onChange={(e) => updateCurrent({ timeLimit: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:border-[#46178f] focus:outline-none"
            >
              {TIME_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec} detik
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
              <Award className="w-3.5 h-3.5" /> Poin
            </label>
            <select
              value={current.pointsMode}
              onChange={(e) => updateCurrent({ pointsMode: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:border-[#46178f] focus:outline-none"
            >
              <option value="standard">Standar (0–1000)</option>
              <option value="double">Poin Ganda (0–2000)</option>
              <option value="none">Tanpa Poin (0)</option>
            </select>
          </div>
        </aside>
      </div>

      {/* Quiz Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="font-display font-black text-xl text-slate-900">Pengaturan Kuis</h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Judul Kuis</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#46178f] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#46178f] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Visibilitas</label>
                <select
                  value={isPublic ? 'public' : 'private'}
                  onChange={(e) => setIsPublic(e.target.value === 'public')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                >
                  <option value="public">Publik</option>
                  <option value="private">Privat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Warna Sampul</label>
              <div className="flex gap-2.5">
                {COVER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoverColor(c)}
                    className={`w-9 h-9 rounded-full cursor-pointer transition ${
                      coverColor === c ? 'ring-4 ring-offset-2 ring-slate-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 rounded-xl bg-[#46178f] text-white font-bold cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
