import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, MessageCircle, FileText, Users, CreditCard, Settings, Activity, LayoutDashboard } from 'lucide-react';
import { useAuth, usePlan } from '../../context/AuthContext';

const navItemClass =
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800/80';

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, logout } = useAuth();
  const plan = usePlan();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isAuditEnabled = plan === 'pro' || plan === 'enterprise';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/80">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-violet flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <div>
            <div className="text-sm font-semibold">Aurora Workspace</div>
            <div className="text-xs text-slate-400">{me?.organization.name}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-slate-300 text-sm">
          <NavLink to="/app" className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink
            to="/app/assistant"
            className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}
          >
            <MessageCircle className="w-4 h-4" />
            AI Assistant
          </NavLink>
          <NavLink
            to="/app/documents"
            className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </NavLink>
          <NavLink to="/app/team" className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}>
            <Users className="w-4 h-4" />
            Team
          </NavLink>
          <NavLink
            to="/app/billing"
            className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </NavLink>
          <NavLink
            to="/app/settings"
            className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
          {isAuditEnabled ? (
            <NavLink
              to="/app/audit-log"
              className={({ isActive }) => `${navItemClass} ${isActive ? 'bg-slate-800' : ''}`}
            >
              <Activity className="w-4 h-4" />
              Audit Log
            </NavLink>
          ) : (
            <div className={`${navItemClass} opacity-60 cursor-not-allowed`}>
              <Activity className="w-4 h-4" />
              Audit Log
              <span className="ml-auto text-2xs px-1.5 py-0.5 rounded-full bg-brand-indigo/10 text-brand-indigo">
                Pro+
              </span>
            </div>
          )}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <div>
            <div className="font-medium text-slate-200 text-xs">{me?.user.email}</div>
            <div className="flex items-center gap-1">
              <span className="capitalize">{me?.user.role}</span>
              <span>•</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  plan === 'enterprise'
                    ? 'bg-brand-violet/10 text-brand-violet'
                    : plan === 'pro'
                    ? 'bg-brand-indigo/10 text-brand-indigo'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-slate-100 hover:underline transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-violet flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="text-sm font-semibold">Aurora Workspace</span>
        </Link>
        <button
          className="inline-flex items-center justify-center rounded-lg p-1.5 border border-slate-700 bg-slate-900/80"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-slate-950/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute top-16 inset-x-3 glass rounded-2xl p-3 space-y-1 text-sm text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <NavLink
              to="/app"
              className={({ isActive }) =>
                `${navItemClass} ${isActive ? 'bg-slate-800' : ''} w-full justify-start`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/app/assistant"
              className={({ isActive }) =>
                `${navItemClass} ${isActive ? 'bg-slate-800' : ''} w-full justify-start`
              }
            >
              <MessageCircle className="w-4 h-4" />
              AI Assistant
            </NavLink>
            <NavLink
              to="/app/documents"
              className={({ isActive }) =>
                `${navItemClass} ${isActive ? 'bg-slate-800' : ''} w-full justify-start`
              }
            >
              <FileText className="w-4 h-4" />
              Documents
            </NavLink>
            <NavLink
              to="/app/team"
              className={({ isActive }) =>
                `${navItemClass} ${isActive ? 'bg-slate-800' : ''} w-full justify-start`
              }
            >
              <Users className="w-4 h-4" />
              Team
            </NavLink>
            <NavLink
              to="/app/billing"
              className={({ isActive }) =>
                `${navItemClass} ${isActive ? 'bg-slate-800' : ''} w-full justify-start`
              }
            >
              <CreditCard className="w-4 h-4" />
              Billing
            </NavLink>
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `${navItemClass} ${isActive ? 'bg-slate-800' : ''} w-full justify-start`
              }
            >
              <Settings className="w-4 h-4" />
              Settings
            </NavLink>
            <button
              onClick={logout}
              className="w-full text-left text-xs text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg"
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen md:ml-0 md:pl-64">
        <div className="md:hidden h-14" />
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
};

export default AppShell;

