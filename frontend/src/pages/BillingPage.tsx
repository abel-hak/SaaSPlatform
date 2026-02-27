import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, UsageMetrics, UsageResponse } from '../lib/api';
import { usePlan } from '../context/AuthContext';
import UsageMeters from '../components/UsageMeters';

const BillingPage: React.FC = () => {
  const plan = usePlan();
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between text-xs">
        <div>
          <div className="text-slate-200 font-semibold">Billing</div>
          <div className="text-slate-400">Manage your subscription, limits, and invoices.</div>
        </div>
      </header>

      <section className="glass rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <div>
          <div className="text-slate-300 mb-1">Current plan</div>
          <div className="text-lg font-semibold text-slate-100">{planLabel}</div>
          <div className="text-slate-400 mt-1">
            {plan === 'free'
              ? 'You are on the Free plan with limited usage.'
              : plan === 'pro'
              ? 'You are on the Pro plan with higher limits and history.'
              : 'You are on the Enterprise plan with unlimited usage.'}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createCheckout('pro')}
            disabled={loading || plan === 'pro'}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold disabled:opacity-60"
          >
            {plan === 'pro' ? 'On Pro' : 'Switch to Pro'}
          </button>
          <button
            onClick={() => createCheckout('enterprise')}
            disabled={loading || plan === 'enterprise'}
            className="px-4 py-2 rounded-full border border-slate-700 text-xs font-semibold text-slate-200 disabled:opacity-60"
          >
            {plan === 'enterprise' ? 'On Enterprise' : 'Switch to Enterprise'}
          </button>
          <button
            onClick={openPortal}
            className="px-4 py-2 rounded-full border border-slate-700 text-xs font-semibold text-slate-200"
          >
            Manage payment method
          </button>
        </div>
      </section>

      <UsageMeters usage={usage} />
    </div>
  );
};

export default BillingPage;

