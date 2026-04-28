import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  MessageCircle,
  FileText,
  Users,
  CreditCard,
  Settings,
  Activity,
  LayoutDashboard,
  Moon,
  Sun,
  LogOut,
  Key,
} from 'lucide-react';
import { useAuth, usePlan } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useIsAdmin } from '../../hooks/useRole';

const allLinks = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true, adminOnly: false },
  { to: '/app/assistant', label: 'AI Assistant', icon: MessageCircle, adminOnly: false },
  { to: '/app/documents', label: 'Documents', icon: FileText, adminOnly: false },
  { to: '/app/team', label: 'Team', icon: Users, adminOnly: true },
  { to: '/app/billing', label: 'Billing', icon: CreditCard, adminOnly: true },
  { to: '/app/settings', label: 'Settings', icon: Settings, adminOnly: false },
  { to: '/app/api-keys', label: 'API Keys', icon: Key, adminOnly: true },
];

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, logout } = useAuth();
  const plan = usePlan();
  const { theme, toggle } = useTheme();
  const isAdmin = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = allLinks.filter((l) => !l.adminOnly || isAdmin);
  const isAuditEnabled = plan === 'pro' || plan === 'enterprise';
  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free';
  const planBadge =
    plan === 'enterprise'
      ? 'badge-brand'
      : plan === 'pro'
      ? 'badge-brand'
      : 'badge-neutral';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-item-active' : 'nav-item';

  return (
    <div className="min-h-screen bg-surface-page dark:bg-[#212121] flex">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-surface-border dark:border-[#333] bg-surface-card dark:bg-[#171717] flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-surface-border dark:border-[#333]">
          <div className="h-8 w-8 rounded-lg bg-brand-600 dark:bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9" />
              <circle cx="9" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">Aurora Workspace</div>
            <div className="text-xs text-slate-500 dark:text-[#8e8e8e] truncate">{me?.organization.name}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {isAuditEnabled ? (
            <NavLink to="/app/audit-log" className={navLinkClass}>
              <Activity className="w-4 h-4 flex-shrink-0" />
              Audit Log
            </NavLink>
          ) : (
            <div className="nav-item opacity-50 cursor-not-allowed">
              <Activity className="w-4 h-4 flex-shrink-0" />
              Audit Log
              <span className="ml-auto badge-brand text-2xs !py-0 !px-1.5">Pro+</span>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border dark:border-[#333] space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-white truncate">{me?.user.email}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-[#8e8e8e] capitalize">{me?.user.role}</span>
                <span className="text-slate-300 dark:text-[#555]">·</span>
                <span className={planBadge}>{planLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn-ghost !p-1.5 !rounded-lg" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={logout} className="btn-ghost !p-1.5 !rounded-lg text-slate-400 hover:text-red-500" aria-label="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Top Bar ─── */}
      <div className="md:hidden fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface-card/90 dark:bg-[#171717]/90 backdrop-blur-md border-b border-surface-border dark:border-[#333]">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9" />
              <circle cx="9" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Aurora</span>
        </Link>
        <button className="btn-ghost !p-1.5" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── Mobile Drawer ─── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-16 inset-x-3 card p-3 space-y-0.5 animate-fade-in shadow-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={() => setMobileOpen(false)}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
            {isAuditEnabled && (
              <NavLink to="/app/audit-log" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                <Activity className="w-4 h-4" />
                Audit Log
              </NavLink>
            )}
            <div className="border-t border-surface-border dark:border-[#424242] mt-2 pt-2 flex items-center justify-between">
              <button onClick={toggle} className="btn-ghost !p-1.5" aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={logout} className="btn-ghost text-xs text-red-500">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-h-screen">
        <div className="md:hidden h-14" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 animate-page">{children}</div>
      </main>
    </div>
  );
};

export default AppShell;
