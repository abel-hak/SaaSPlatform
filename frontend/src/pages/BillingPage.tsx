import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, UsageMetrics, UsageResponse } from '../lib/api';
import { usePlan } from '../context/AuthContext';
import UsageMeters from '../components/UsageMeters';
import { Check, Zap, Briefcase, Building2, Loader2 } from 'lucide-react';

interface PlanCard {
  key: 'free' | 'pro' | 'enterprise';
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  highlight?: boolean;
}

const plans: PlanCard[] = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individuals and small experiments.',
    icon: Zap,
    features: ['5 AI queries / month', '10 documents', '1 team seat', 'Community support'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing teams that need higher limits and history.',
    icon: Briefcase,
    highlight: true,
    features: ['500 AI queries / month', '100 documents', '10 team seats', 'Audit log', 'Priority support'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    period: 'per month',
    description: 'Unlimited usage for large organisations.',
    icon: Building2,
    features: ['Unlimited AI queries', 'Unlimited documents', 'Unlimited seats', 'Audit log', 'Dedicated support', 'SLA guarantees'],
  },
];

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Manage your subscription, limits, and invoices.</p>
        </div>
        {plan !== 'free' && (
          <button onClick={openPortal} className="btn-secondary text-xs py-2">
            Manage payment method
          </button>
        )}
      </div>

      {/* Usage section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Usage this month</h2>
        <UsageMeters usage={usage} />
      </section>

      {/* Plan cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = plan === p.key;
            return (
              <div
                key={p.key}
                className={`card p-5 flex flex-col relative ${
                  p.highlight
                    ? 'ring-2 ring-brand-600 shadow-card-hover'
                    : ''
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="badge-brand px-3 py-1 text-xs font-semibold shadow-sm">Most popular</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${p.highlight ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-slate-500'}`}>
                    <p.icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800">{p.name}</span>
                  {isCurrent && <span className="badge-success ml-auto">Current</span>}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">{p.price}</span>
                    <span className="text-sm text-slate-400">{p.period}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{p.description}</p>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {p.key === 'free' ? (
                  <button disabled className="btn-secondary w-full text-xs cursor-not-allowed opacity-60">
                    {isCurrent ? 'Current plan' : 'Downgrade'}
                  </button>
                ) : (
                  <button
                    onClick={() => createCheckout(p.key as 'pro' | 'enterprise')}
                    disabled={loading || isCurrent}
                    className={`w-full text-xs ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      'Current plan'
                    ) : (
                      `Switch to ${p.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default BillingPage;
