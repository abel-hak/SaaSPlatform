import React from 'react';
import { UsageMetrics } from '../lib/api';
import { Zap, FileText, Users, ArrowUpRight } from 'lucide-react';

interface Props {
  usage: UsageMetrics | null;
  onUpgradeClick?: () => void;
}

const icons = [Zap, FileText, Users];

const meterColor = (used: number, limit: number | null) => {
  if (!limit) return 'bg-brand-500';
  const r = used / limit;
  if (r >= 1)   return 'bg-red-500';
  if (r >= 0.8) return 'bg-amber-500';
  return 'bg-brand-500';
};

const UsageMeters: React.FC<Props> = ({ usage, onUpgradeClick }) => {
  if (!usage) return null;

  const items = [
    { label: 'AI Queries',  used: usage.ai_queries_used,    limit: usage.ai_queries_limit,    icon: icons[0] },
    { label: 'Documents',   used: usage.documents_uploaded,  limit: usage.documents_limit,     icon: icons[1] },
    { label: 'Team Seats',  used: usage.seats_used,          limit: usage.seats_limit,         icon: icons[2] },
  ];

  const warn = usage.warnings.length > 0;

  return (
    <div className="space-y-4">
      {warn && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Approaching plan limits</p>
            <ul className="mt-1 space-y-0.5">
              {usage.warnings.map((w) => (
                <li key={w} className="text-xs text-amber-700 dark:text-amber-400">{w}</li>
              ))}
            </ul>
          </div>
          {onUpgradeClick && (
            <button onClick={onUpgradeClick} className="btn-primary whitespace-nowrap text-xs py-2 px-3">
              Upgrade plan <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(({ label, used, limit, icon: Icon }) => {
          const pct = !limit ? 0 : Math.min(used / limit, 1) * 100;
          const color = meterColor(used, limit);
          return (
            <div key={label} className="card px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-[#d4d4d4]">
                  <Icon className="w-4 h-4 text-slate-400 dark:text-[#8e8e8e]" />
                  {label}
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {used}
                  <span className="text-slate-400 dark:text-[#8e8e8e] font-normal">
                    {limit ? ` / ${limit}` : ' / ∞'}
                  </span>
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {limit && (
                <p className="mt-2 text-xs text-slate-400 dark:text-[#8e8e8e]">
                  {Math.round(pct)}% of limit used
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageMeters;
