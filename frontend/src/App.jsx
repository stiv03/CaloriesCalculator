// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import RegisterPage from './features/auth/RegisterPage';
import LoginPage from './features/auth/LoginPage';
import TodayPage from './features/today/TodayPage';
import ProgressPage from './features/profile/ProgressPage';
import ProfilePage from './features/profile/ProfilePage';
import SupplementsPage from './features/supplements/SupplementsPage';
import WorkoutPage from './features/workout/WorkoutPage';
import CalendarPage from './features/calendar/CalendarPage';
import { isAuthenticated } from './auth/storage';

import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import { applyStoredTheme } from './utils/theme';

applyStoredTheme();

const RequireAuth = ({ children }) =>
  isAuthenticated() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/supplements" element={<SupplementsPage />} />
          <Route path="/settings" element={<ProfilePage />} />
        </Route>
        {/* Old route still resolves */}
        <Route path="/calories-calculator" element={<Navigate to="/today" replace />} />
        <Route path="/" element={<Navigate to={isAuthenticated() ? '/today' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
