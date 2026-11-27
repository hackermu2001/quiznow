import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, PlusCircle, BarChart3, LogOut, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/discover', label: 'Jelajahi Kuis', icon: Compass },
    { to: '/reports', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-[#46178f] text-white flex items-center justify-center font-display font-black text-xl shadow-sm group-hover:scale-105 transition">
              Q!
            </div>
            <span className="font-display font-black text-xl tracking-tight text-[#46178f]">
              QuizNow<span className="text-[#e21b3c]">!</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold transition ${
                    active
                      ? 'bg-purple-100 text-[#46178f]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/join"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold text-[#46178f] bg-purple-50 hover:bg-purple-100 transition"
          >
            <Gamepad2 className="w-4 h-4" />
            Gabung PIN
          </Link>

          <Link
            to="/create"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-extrabold text-white bg-[#1368ce] hover:bg-[#0f57ad] btn-3d"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Kuis</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100">
                <span className="text-lg leading-none">{user.avatar}</span>
                <span className="text-sm font-bold text-slate-800 hidden sm:inline">
                  {user.username}
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Keluar"
                className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg text-sm font-bold text-slate-700 border border-slate-300 hover:bg-slate-50 transition"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
