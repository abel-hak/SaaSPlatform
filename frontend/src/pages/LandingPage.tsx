import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, FileText, ShieldCheck } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-brand-indigo to-brand-violet flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight">Aurora Workspace</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-slate-300 hover:text-slate-50">
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-full bg-slate-50 text-slate-900 text-xs font-semibold px-4 py-2 shadow-md hover:bg-white"
          >
            Get Started Free
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Your team&apos;s AI-native <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo to-brand-violet">knowledge workspace</span>.
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              Bring your documents, team, and billing into a single secure workspace. Aurora gives every organization a
              focused AI assistant that only knows your data.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold px-5 py-2.5 shadow-lg shadow-indigo-500/30"
              >
                Get Started Free
              </Link>
              <span className="text-slate-400">No credit card required for Free plan.</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                SOC2-ready architecture
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tenant-isolated RLS by default
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-brand-indigo/40 via-brand-violet/30 to-slate-900/0 blur-3xl opacity-60" />
            <div className="relative glass rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-xl bg-slate-900/80 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-brand-indigo" />
                  </div>
                  <span>AI Assistant</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">
                  Live • Streaming
                </span>
              </div>
              <div className="bg-slate-900/60 rounded-2xl p-3 space-y-2 text-xs">
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-brand-indigo/30 flex items-center justify-center text-[10px]">
                    U
                  </div>
                  <div className="flex-1 bg-slate-800/70 rounded-2xl px-3 py-2">
                    How is our usage trending this month across AI queries and document uploads?
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-brand-violet" />
                  </div>
                  <div className="flex-1 bg-slate-900/80 rounded-2xl px-3 py-2 border border-slate-800/80">
                    <div className="h-1.5 w-10 bg-gradient-to-r from-brand-indigo to-brand-violet rounded-full animate-pulse mb-2" />
                    <p className="text-slate-200">
                      You&apos;ve used <span className="font-semibold text-emerald-300">32 / 50</span> AI queries and{' '}
                      <span className="font-semibold text-emerald-300">3 / 5</span> document uploads on your Free plan.
                      You&apos;re on track to hit limits by the 21st — consider upgrading to Pro for higher limits and
                      full conversation history.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-300">
                <div className="glass rounded-2xl px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span>AI Queries</span>
                    <span className="text-slate-400 text-[10px]">32 / 50</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900/80">
                    <div className="h-full w-2/3 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="glass rounded-2xl px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span>Documents</span>
                    <span className="text-slate-400 text-[10px]">3 / 5</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900/80">
                    <div className="h-full w-3/5 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="glass rounded-2xl px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span>Team Seats</span>
                    <span className="text-slate-400 text-[10px]">1 / 1</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900/80">
                    <div className="h-full w-full rounded-full bg-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid md:grid-cols-3 gap-5">
          <div className="glass rounded-3xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="w-4 h-4 text-brand-indigo" />
              Tenant-scoped AI assistant
            </div>
            <p className="text-xs text-slate-300">
              Each organization gets a private assistant grounded exclusively in your documents, with per-tenant
              isolation enforced in Postgres.
            </p>
          </div>
          <div className="glass rounded-3xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="w-4 h-4 text-brand-violet" />
              Production billing & quotas
            </div>
            <p className="text-xs text-slate-300">
              Stripe-powered subscriptions, usage meters, soft limit warnings, and plan-based feature flags baked into
              every endpoint.
            </p>
          </div>
          <div className="glass rounded-3xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Enterprise-ready by design
            </div>
            <p className="text-xs text-slate-300">
              Real PostgreSQL RLS, audit logs, per-org queues, and health checks that feel like a shipped SaaS, not a
              demo.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">Pricing</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="glass rounded-3xl p-4 flex flex-col justify-between border-slate-800">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">Free</div>
                <div className="text-2xl font-semibold">$0</div>
                <p className="text-xs text-slate-400">Perfect for trying Aurora with a small team.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                  <li>• 1 user</li>
                  <li>• 50 AI queries / month</li>
                  <li>• 5 document uploads</li>
                  <li>• No conversation history</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
              >
                Start Free
              </Link>
            </div>

            <div className="glass rounded-3xl p-4 flex flex-col justify-between border border-brand-indigo/50 shadow-lg shadow-brand-indigo/40 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-indigo/10 via-brand-violet/10 to-transparent pointer-events-none" />
              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-50">Pro</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">
                    Recommended
                  </span>
                </div>
                <div className="text-2xl font-semibold">$29</div>
                <p className="text-xs text-slate-300">For growing teams that rely on AI every day.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-200">
                  <li>• Up to 5 users</li>
                  <li>• 500 AI queries / month</li>
                  <li>• Unlimited documents</li>
                  <li>• Full conversation history</li>
                  <li>• Audit log (read-only)</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="relative mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet px-4 py-2 text-xs font-semibold text-white shadow-md"
              >
                Start 14-day trial
              </Link>
            </div>

            <div className="glass rounded-3xl p-4 flex flex-col justify-between border-slate-800">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">Enterprise</div>
                <div className="text-2xl font-semibold">$99</div>
                <p className="text-xs text-slate-400">For organizations that need scale and control.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                  <li>• Unlimited users & queries</li>
                  <li>• Priority queue (faster model)</li>
                  <li>• Full audit log access</li>
                  <li>• Dedicated workspace support</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-800/80 pt-5 text-xs text-slate-500 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <span>© {new Date().getFullYear()} Aurora Workspace Inc.</span>
          <div className="flex gap-4">
            <button className="hover:text-slate-300">Status</button>
            <button className="hover:text-slate-300">Security</button>
            <button className="hover:text-slate-300">Docs</button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;

