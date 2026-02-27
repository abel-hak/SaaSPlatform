import React from 'react';
import { UsageMetrics } from '../lib/api';

interface Props {
  usage: UsageMetrics | null;
  onUpgradeClick?: () => void;
}

const meterColor = (used: number, limit: number | null) => {
  if (!limit || limit === 0) return 'bg-emerald-500';
  const ratio = used / limit;
  if (ratio >= 1) return 'bg-rose-500';
  if (ratio >= 0.8) return 'bg-amber-400';
  return 'bg-emerald-500';
};

const UsageMeters: React.FC<Props> = ({ usage, onUpgradeClick }) => {
  if (!usage) return null;
  const items = [
    {
      label: 'AI Queries',
      used: usage.ai_queries_used,
      limit: usage.ai_queries_limit
    },
    {
      label: 'Documents',
      used: usage.documents_uploaded,
      limit: usage.documents_limit
    },
    {
      label: 'Team Seats',
      used: usage.seats_used,
      limit: usage.seats_limit
    }
  ];

  const warn = usage.warnings.length > 0;

  return (
    <div className="space-y-4">
      {warn && (
        <div className="glass border-amber-500/30 bg-amber-950/40 text-amber-100 px-4 py-3 rounded-2xl text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-semibold">You&apos;re approaching your plan limits.</div>
            <ul className="mt-1 text-xs space-y-0.5">
              {usage.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold shadow-md"
            >
              Upgrade plan
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const { label, used, limit } = item;
          const pct = !limit || limit === 0 ? 0 : Math.min(used / limit, 1) * 100;
          return (
            <div key={label} className="glass rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">{label}</span>
                <span className="font-semibold text-slate-100">
                  {used}
                  {limit ? ` / ${limit}` : ' • ∞'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${meterColor(used, limit)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageMeters;

