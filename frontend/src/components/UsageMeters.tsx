import React from 'react';
import { UsageMetrics } from '../lib/api';

interface Props {
  usage: UsageMetrics | null;
  onUpgradeClick?: () => void;
}

const meterColor = (used: number, limit: number | null) => {
  if (!limit || limit === 0) return 'bg-emerald-500';
  const ratio = used / limit;
  if (ratio >= 1) return 'bg-red-500';
  if (ratio >= 0.8) return 'bg-amber-400';
  return 'bg-emerald-500';
};

const UsageMeters: React.FC<Props> = ({ usage, onUpgradeClick }) => {
  if (!usage) return null;

  const items = [
    { label: 'AI Queries', used: usage.ai_queries_used, limit: usage.ai_queries_limit },
    { label: 'Documents', used: usage.documents_uploaded, limit: usage.documents_limit },
    { label: 'Team Seats', used: usage.seats_used, limit: usage.seats_limit },
  ];

  const hasWarnings = usage.warnings.length > 0;

  return (
    <div className="space-y-4">
      {hasWarnings && (
        <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              You&apos;re approaching your plan limits.
            </p>
            <ul className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80 space-y-0.5">
              {usage.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          {onUpgradeClick && (
            <button onClick={onUpgradeClick} className="btn-primary text-sm py-2 px-4 flex-shrink-0">
              Upgrade plan
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(({ label, used, limit }) => {
          const pct = !limit || limit === 0 ? 0 : Math.min(used / limit, 1) * 100;
          return (
            <div key={label} className="card px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-[#8e8e8e]">{label}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {used}
                  {limit ? ` / ${limit}` : ' · ∞'}
                </span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${meterColor(used, limit)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageMeters;
