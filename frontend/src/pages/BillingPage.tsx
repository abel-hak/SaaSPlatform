import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, ExternalLink } from 'lucide-react';
import { api, UsageMetrics, UsageResponse } from '../lib/api';
import { usePlan } from '../context/AuthContext';
import UsageMeters from '../components/UsageMeters';

const BillingPage: React.FC = () => {
  const plan = usePlan();
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<UsageResponse>('/usage/').then((r) => setUsage(r.data.usage)).catch(() => {});
  }, []);

  const createCheckout = async (targetPlan: 'pro' | 'enterprise') => {
    setLoading(true);
    try {
      const res = await api.post('/billing/checkout-session', { plan: targetPlan });
      window.location.href = res.data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      const res = await api.get('/billing/portal');
      window.location.href = res.data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to open billing portal');
    }
  };

  const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro' : 'Free';
  const planBadge = plan === 'enterprise' || plan === 'pro' ? 'badge-brand' : 'badge-neutral';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Manage your subscription, limits, and invoices.</p>
        </div>
      </div>

      {/* Current plan */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500 dark:text-[#8e8e8e] uppercase tracking-wide">
                Current plan
              </span>
            </div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">{planLabel}</div>
            <p className="text-sm text-slate-500 dark:text-[#9a9a9a] mt-1">
              {plan === 'free'
                ? 'You are on the Free plan with limited usage.'
                : plan === 'pro'
                ? 'Pro plan — higher limits and conversation history.'
                : 'Enterprise plan — unlimited usage and priority support.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => createCheckout('pro')}
              disabled={loading || plan === 'pro'}
              className="btn-primary text-sm py-2 px-4"
            >
              {plan === 'pro' ? 'On Pro' : 'Upgrade to Pro'}
            </button>
            <button
              onClick={() => createCheckout('enterprise')}
              disabled={loading || plan === 'enterprise'}
              className="btn-secondary text-sm py-2 px-4"
            >
              {plan === 'enterprise' ? 'On Enterprise' : 'Upgrade to Enterprise'}
            </button>
            <button onClick={openPortal} className="btn-ghost text-sm py-2 px-3">
              Payment method <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            name: 'Free',
            price: '$0',
            desc: 'For individuals trying Aurora.',
            features: ['1 user', '50 AI queries / month', '5 document uploads', 'No conversation history'],
            current: plan === 'free',
          },
          {
            name: 'Pro',
            price: '$29',
            desc: 'For growing teams.',
            features: ['Up to 5 users', '500 AI queries / month', 'Unlimited documents', 'Full conversation history', 'Audit log'],
            current: plan === 'pro',
            recommended: true,
          },
          {
            name: 'Enterprise',
            price: '$99',
            desc: 'For scale and control.',
            features: ['Unlimited users & queries', 'Priority queue (faster model)', 'Full audit log', 'Dedicated support'],
            current: plan === 'enterprise',
          },
        ].map((p) => (
          <div
            key={p.name}
            className={`card p-5 flex flex-col ${
              p.recommended ? 'ring-2 ring-brand-500 dark:ring-brand-400' : ''
            } ${p.current ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</span>
              {p.recommended && <span className="badge-success text-2xs">Recommended</span>}
              {p.current && <span className="badge-brand text-2xs">Current</span>}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{p.price}<span className="text-sm font-normal text-slate-500">/mo</span></div>
            <p className="text-xs text-slate-500 dark:text-[#8e8e8e] mt-1 mb-4">{p.desc}</p>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-[#d4d4d4] flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Usage */}
      <UsageMeters usage={usage} onUpgradeClick={() => createCheckout('pro')} />
    </div>
  );
};

export default BillingPage;
