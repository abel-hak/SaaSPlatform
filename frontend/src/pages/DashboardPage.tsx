import React, { useEffect, useState } from 'react';
import { ArrowRight, UploadCloud, MessageCircle, Users } from 'lucide-react';
import { api, UsageMetrics, UsageResponse } from '../lib/api';
import { useAuth, usePlan } from '../context/AuthContext';
import UsageMeters from '../components/UsageMeters';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { me } = useAuth();
  const plan = usePlan();
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<UsageResponse>('/usage/');
        setUsage(res.data.usage);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free';
  const planColor =
    plan === 'enterprise'
      ? 'bg-brand-violet/10 text-brand-violet border-brand-violet/40'
      : plan === 'pro'
      ? 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/40'
      : 'bg-slate-800/60 text-slate-200 border-slate-700';

  const onUpgradeClick = () => navigate('/app/billing');

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">Welcome back</div>
          <h1 className="text-xl font-semibold text-slate-100">{me?.organization.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${planColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {planLabel} plan
          </span>
          <button
            onClick={onUpgradeClick}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/70 border border-slate-700 text-slate-200 hover:border-brand-indigo/60"
          >
            Manage billing
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      <UsageMeters usage={usage} onUpgradeClick={onUpgradeClick} />

      <section className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/app/documents')}
          className="glass rounded-2xl px-4 py-3 flex items-center justify-between hover:border-brand-indigo/40 transition-colors"
        >
          <div className="space-y-1 text-left">
            <div className="text-xs font-semibold text-slate-100">Upload document</div>
            <div className="text-[11px] text-slate-400">Ingest PDFs, markdown, and more.</div>
          </div>
          <div className="h-8 w-8 rounded-xl bg-brand-indigo/20 flex items-center justify-center">
            <UploadCloud className="w-4 h-4 text-brand-indigo" />
          </div>
        </button>
        <button
          onClick={() => navigate('/app/assistant')}
          className="glass rounded-2xl px-4 py-3 flex items-center justify-between hover:border-brand-indigo/40 transition-colors"
        >
          <div className="space-y-1 text-left">
            <div className="text-xs font-semibold text-slate-100">Ask Aurora</div>
            <div className="text-[11px] text-slate-400">Chat with an assistant grounded in your docs.</div>
          </div>
          <div className="h-8 w-8 rounded-xl bg-brand-violet/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-brand-violet" />
          </div>
        </button>
        <button
          onClick={() => navigate('/app/team')}
          className="glass rounded-2xl px-4 py-3 flex items-center justify-between hover:border-brand-indigo/40 transition-colors"
        >
          <div className="space-y-1 text-left">
            <div className="text-xs font-semibold text-slate-100">Invite teammates</div>
            <div className="text-[11px] text-slate-400">Share your AI workspace with your team.</div>
          </div>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-300" />
          </div>
        </button>
      </section>
    </div>
  );
};

export default DashboardPage;

