import React, { useEffect, useState } from 'react';
import { ArrowRight, UploadCloud, MessageCircle, Users, FileText, Loader2 } from 'lucide-react';
import { api, UsageMetrics, UsageResponse } from '../lib/api';
import { useAuth, usePlan } from '../context/AuthContext';
import UsageMeters from '../components/UsageMeters';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { me } = useAuth();
  const plan = usePlan();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<UsageResponse>('/usage/');
        setUsage(res.data.usage);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free';
  const planBadge = plan === 'enterprise' || plan === 'pro' ? 'badge-brand' : 'badge-neutral';

  const isNewUser = !loading && usage && usage.ai_queries_used === 0 && usage.documents_uploaded === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back</h1>
          <p className="page-subtitle">{me?.organization.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={planBadge}>{planLabel} plan</span>
          <button onClick={() => navigate('/app/billing')} className="btn-secondary text-xs py-1.5 px-3">
            Manage billing <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Usage Meters */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card px-4 py-4">
              <div className="skeleton h-4 w-20 mb-3" />
              <div className="skeleton h-2 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card px-4 py-6 text-center">
          <p className="text-sm text-slate-500 dark:text-[#9a9a9a]">Unable to load usage data.</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-xs mt-3 py-1.5 px-3">
            Retry
          </button>
        </div>
      ) : (
        <UsageMeters usage={usage} onUpgradeClick={() => navigate('/app/billing')} />
      )}

      {/* Getting Started (new users) */}
      {isNewUser && (
        <div className="card p-6 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Get started with Aurora</h2>
          <p className="text-sm text-slate-500 dark:text-[#9a9a9a] mb-4">
            Complete these steps to set up your AI workspace.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <button onClick={() => navigate('/app/documents')} className="card hover:shadow-card-hover transition-shadow px-4 py-3 text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">1. Upload a document</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">PDFs, markdown, or text files.</p>
            </button>
            <button onClick={() => navigate('/app/assistant')} className="card hover:shadow-card-hover transition-shadow px-4 py-3 text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">2. Ask Aurora</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">Chat grounded in your docs.</p>
            </button>
            <button onClick={() => navigate('/app/team')} className="card hover:shadow-card-hover transition-shadow px-4 py-3 text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">3. Invite teammates</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">Share your workspace.</p>
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <section className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/app/documents')}
          className="card hover:shadow-card-hover transition-shadow px-4 py-4 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Upload document</div>
            <div className="text-xs text-slate-500 dark:text-[#8e8e8e] mt-0.5">Ingest PDFs, markdown, and more.</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 ml-3">
            <UploadCloud className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
        </button>
        <button
          onClick={() => navigate('/app/assistant')}
          className="card hover:shadow-card-hover transition-shadow px-4 py-4 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Ask Aurora</div>
            <div className="text-xs text-slate-500 dark:text-[#8e8e8e] mt-0.5">Chat with your AI assistant.</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 ml-3">
            <MessageCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
        </button>
        <button
          onClick={() => navigate('/app/team')}
          className="card hover:shadow-card-hover transition-shadow px-4 py-4 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Invite teammates</div>
            <div className="text-xs text-slate-500 dark:text-[#8e8e8e] mt-0.5">Share your AI workspace.</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 ml-3">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </button>
      </section>
    </div>
  );
};

export default DashboardPage;
