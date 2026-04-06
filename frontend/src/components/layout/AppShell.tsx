import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Menu, X, MessageCircle, FileText, Users, CreditCard,
  Settings, Activity, LayoutDashboard, LogOut
} from 'lucide-react';
import { useAuth, usePlan } from '../../context/AuthContext';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  restricted?: boolean;
}

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, logout } = useAuth();
  const plan = usePlan();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuditEnabled = plan === 'pro' || plan === 'enterprise';

  const navItems: NavItem[] = [
    { to: '/app',             icon: LayoutDashboard, label: 'Dashboard',    end: true },
    { to: '/app/assistant',   icon: MessageCircle,   label: 'AI Assistant'           },
    { to: '/app/documents',   icon: FileText,        label: 'Documents'              },
    { to: '/app/team',        icon: Users,           label: 'Team'                   },
    { to: '/app/billing',     icon: CreditCard,      label: 'Billing'                },
    { to: '/app/settings',    icon: Settings,        label: 'Settings'               },
    { to: '/app/audit-log',   icon: Activity,        label: 'Audit Log', restricted: !isAuditEnabled },
  ];

  const planBadge = plan === 'enterprise' || plan === 'pro' ? 'badge-brand' : 'badge-neutral';
  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free';
  const initials = me?.user.email?.slice(0, 2).toUpperCase() ?? 'AU';

  const SidebarNav = () => (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => {
        if (item.restricted) {
          return (
            <div
              key={item.to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed select-none"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              <span className="ml-auto badge badge-neutral text-[10px] py-0">Pro+</span>
            </div>
          );
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item'
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-page flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col bg-surface-card border-r border-surface-border fixed inset-y-0 z-20">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-surface-border flex-shrink-0">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">Aurora</div>
            <div className="text-xs text-slate-400 truncate">{me?.organization.name}</div>
          </div>
        </div>

        <SidebarNav />

        {/* User footer */}
        <div className="px-3 pb-4 pt-2 border-t border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group">
            <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-800 truncate">{me?.user.email}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-slate-400 capitalize">{me?.user.role}</span>
                <span className={`${planBadge} text-[10px] px-1.5 py-0`}>{planLabel}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-surface-subtle transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden fixed inset-x-0 top-0 z-30 h-14 flex items-center justify-between px-4 bg-surface-card border-b border-surface-border">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900">Aurora</span>
        </Link>
        <button
          className="p-2 rounded-lg text-slate-600 hover:bg-surface-subtle transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bottom-0 bg-surface-card border-t border-surface-border p-3 overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarNav />
            <div className="mt-2 pt-3 border-t border-surface-border">
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="nav-item w-full text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 md:pl-60 min-h-screen flex flex-col">
        <div className="md:hidden h-14" />
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 animate-page">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
