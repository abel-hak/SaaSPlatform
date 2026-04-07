import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, FileText, ShieldCheck } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9" />
              <circle cx="9" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">Aurora Workspace</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-slate-300 hover:text-slate-50">
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white text-slate-900 text-sm font-medium px-4 py-2 shadow-md hover:bg-slate-100 transition-colors"
          >
            Get Started Free
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Your team's AI-native{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">
                knowledge workspace
              </span>
              .
            </h1>
            <p className="text-slate-300 text-base max-w-xl">
              Bring your documents, team, and billing into a single secure workspace. Aurora gives every organization a
              focused AI assistant that only knows your data.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-medium px-5 py-2.5 shadow-lg shadow-brand-600/30 transition-colors"
              >
                Get Started Free
              </Link>
              <span className="text-sm text-slate-400">No credit card required.</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                SOC2-ready architecture
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tenant-isolated RLS
              </div>
            </div>
          </div>

          {/* Demo card */}
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-brand-600/30 via-violet-500/20 to-transparent blur-3xl opacity-60" />
            <div className="relative bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-slate-800 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <span>AI Assistant</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-2xs">
                  Live · Streaming
                </span>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center text-2xs text-brand-300 flex-shrink-0">
                    U
                  </div>
                  <div className="bg-slate-800/70 rounded-xl px-3 py-2 text-slate-200">
                    How is our usage trending this month?
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-3 h-3 text-violet-400" />
                  </div>
                  <div className="bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800/80 text-slate-200">
                    You've used <span className="font-semibold text-emerald-300">32 / 50</span> AI queries and{' '}
                    <span className="font-semibold text-emerald-300">3 / 5</span> document uploads on your Free plan.
                    Consider upgrading to Pro for higher limits.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
                {[
                  { label: 'AI Queries', used: '32', limit: '50', pct: 'w-2/3' },
                  { label: 'Documents', used: '3', limit: '5', pct: 'w-3/5' },
                  { label: 'Team Seats', used: '1', limit: '1', pct: 'w-full' },
                ].map((m) => (
                  <div key={m.label} className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span>{m.label}</span>
                      <span className="text-slate-400 text-2xs">
                        {m.used} / {m.limit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className={`h-full ${m.pct} rounded-full ${m.label === 'Team Seats' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-16 grid md:grid-cols-3 gap-5">
          {[
            {
              icon: MessageCircle,
              color: 'text-brand-400',
              title: 'Tenant-scoped AI assistant',
              desc: 'Each organization gets a private assistant grounded exclusively in your documents, with per-tenant isolation.',
            },
            {
              icon: FileText,
              color: 'text-violet-400',
              title: 'Production billing & quotas',
              desc: 'Stripe-powered subscriptions, usage meters, soft limit warnings, and plan-based feature flags.',
            },
            {
              icon: ShieldCheck,
              color: 'text-emerald-400',
              title: 'Enterprise-ready by design',
              desc: 'Real PostgreSQL RLS, audit logs, per-org queues, and health checks that feel like a shipped SaaS.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <f.icon className={`w-4 h-4 ${f.color}`} />
                {f.title}
              </div>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Pricing */}
        <section className="mt-16">
          <h2 className="text-base font-semibold text-slate-100 mb-5">Pricing</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: 'Free',
                price: '$0',
                desc: 'Perfect for trying Aurora.',
                features: ['1 user', '50 AI queries / month', '5 document uploads', 'No conversation history'],
                cta: 'Start Free',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$29',
                desc: 'For growing teams that rely on AI every day.',
                features: ['Up to 5 users', '500 AI queries / month', 'Unlimited documents', 'Full conversation history', 'Audit log'],
                cta: 'Start 14-day trial',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: '$99',
                desc: 'For organizations that need scale and control.',
                features: ['Unlimited users & queries', 'Priority queue (faster model)', 'Full audit log access', 'Dedicated support'],
                cta: 'Talk to sales',
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`bg-slate-900/50 border rounded-2xl p-5 flex flex-col justify-between ${
                  p.highlight
                    ? 'border-brand-500/50 shadow-lg shadow-brand-500/20 relative overflow-hidden'
                    : 'border-slate-800/60'
                }`}
              >
                {p.highlight && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-violet-500/5 to-transparent pointer-events-none" />
                )}
                <div className="relative space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    {p.highlight && (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {p.price}
                    <span className="text-sm font-normal text-slate-400">/mo</span>
                  </div>
                  <p className="text-sm text-slate-400">{p.desc}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to="/register"
                  className={`relative mt-5 inline-flex items-center justify-center rounded-lg text-sm font-medium px-4 py-2.5 transition-colors ${
                    p.highlight
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
                      : 'border border-slate-700 text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-800/80 pt-5 text-sm text-slate-500 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <span>© {new Date().getFullYear()} Aurora Workspace Inc.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Status</span>
            <span className="hover:text-slate-300 cursor-pointer">Security</span>
            <span className="hover:text-slate-300 cursor-pointer">Docs</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
