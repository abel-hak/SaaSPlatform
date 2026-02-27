import React from 'react';
import { Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AssistantPage from './pages/AssistantPage';
import DocumentsPage from './pages/DocumentsPage';
import TeamPage from './pages/TeamPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogPage from './pages/AuditLogPage';
import NotFoundPage from './pages/NotFoundPage';
import AppShell from './components/layout/AppShell';

const ProtectedLayout: React.FC = () => {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="glass px-6 py-4 rounded-xl text-sm text-slate-300">Loading workspace…</div>
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    <Route path="/app" element={<ProtectedLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="assistant" element={<AssistantPage />} />
      <Route path="documents" element={<DocumentsPage />} />
      <Route path="team" element={<TeamPage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="audit-log" element={<AuditLogPage />} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;

