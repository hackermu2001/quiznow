import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DiscoverPage from './pages/DiscoverPage';
import QuizEditorPage from './pages/QuizEditorPage';
import HostGamePage from './pages/HostGamePage';
import PlayerGamePage from './pages/PlayerGamePage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/create" element={<QuizEditorPage />} />
          <Route path="/edit/:id" element={<QuizEditorPage />} />
          <Route path="/host/:quizId" element={<HostGamePage />} />
          <Route path="/join" element={<PlayerGamePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
