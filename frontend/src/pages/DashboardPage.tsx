import React, { useEffect, useState } from 'react';
import { ArrowRight, UploadCloud, MessageCircle, Users, TrendingUp } from 'lucide-react';
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
    api.get<UsageResponse>('/usage/').then((r) => setUsage(r.data.usage)).catch(() => {});
  }, []);

  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free';
  const planBadge = plan === 'free' || !plan ? 'badge-neutral' : 'badge-brand';

  const quickActions = [
    {
      title: 'Upload document',
      description: 'Ingest PDFs, Markdown, and text files.',
      icon: UploadCloud,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      to: '/app/documents',
    },
    {
      title: 'Ask Aurora AI',
      description: 'Chat with an assistant grounded in your docs.',
      icon: MessageCircle,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      to: '/app/assistant',
    },
    {
      title: 'Invite teammates',
      description: 'Share your AI workspace with your team.',
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      to: '/app/team',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-sm text-slate-500 dark:text-[#9a9a9a] mb-1">Welcome back</p>
          <h1 className="page-title">{me?.organization.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={planBadge}>
            <TrendingUp className="w-3 h-3" />
            {planLabel} plan
          </span>
          <button
            onClick={() => navigate('/app/billing')}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Manage billing
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Usage */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-[#d4d4d4] mb-3">Usage this month</h2>
        <UsageMeters usage={usage} onUpgradeClick={() => navigate('/app/billing')} />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-[#d4d4d4] mb-3">Quick actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.to}
              onClick={() => navigate(action.to)}
              className="card p-4 text-left flex items-start gap-3 hover:shadow-card-hover transition-shadow group"
            >
              <div className={`h-9 w-9 rounded-lg ${action.bg} dark:bg-[#383838] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5">{action.title}</div>
                <div className="text-xs text-slate-500 dark:text-[#9a9a9a] leading-relaxed">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
