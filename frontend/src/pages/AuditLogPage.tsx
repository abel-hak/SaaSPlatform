import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePlan } from '../context/AuthContext';
import { Lock, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuditLogItem {
  id: number;
  org_id: string;
  user_id: string | null;
  action: string;
  details: unknown;
  created_at: string;
}

interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
}

const actionColors: Record<string, string> = {
  'user.login':       'badge-brand',
  'user.register':    'badge-success',
  'document.upload':  'badge-brand',
  'document.delete':  'badge-warn',
  'invite.created':   'badge-success',
  'plan.changed':     'badge-brand',
};

const AuditLogPage: React.FC = () => {
  const plan = usePlan();
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const isEnabled = plan === 'pro' || plan === 'enterprise';

  useEffect(() => {
    if (!isEnabled) return;
    api.get<AuditLogResponse>('/audit-log/').then((r) => setData(r.data)).catch(() => {});
  }, [isEnabled]);

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Review who did what, and when, across your workspace.</p>
        </div>
        <div className="card p-12 flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-surface-subtle flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">Audit log is a Pro+ feature</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              Upgrade to Pro or Enterprise to track invites, uploads, plan changes, and all user activity.
            </p>
          </div>
          <Link to="/app/billing" className="btn-primary text-sm py-2 px-5">
            View plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Review who did what, and when, across your workspace.</p>
        </div>
        {data && (
          <span className="badge-neutral">{data.total} events</span>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle border-b border-surface-border">
              <th className="table-head">Timestamp</th>
              <th className="table-head">Action</th>
              <th className="table-head hidden md:table-cell">User</th>
              <th className="table-head hidden lg:table-cell">Details</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={item.id} className="table-row">
                <td className="table-cell text-slate-500 text-xs whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="table-cell">
                  <span className={actionColors[item.action] ?? 'badge-neutral'}>
                    {item.action}
                  </span>
                </td>
                <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                  {item.user_id ? <code className="font-mono">{item.user_id.slice(0, 8)}…</code> : '—'}
                </td>
                <td className="table-cell hidden lg:table-cell">
                  <code className="text-xs bg-surface-subtle px-2 py-1 rounded text-slate-600 block max-w-xs truncate">
                    {JSON.stringify(item.details ?? {})}
                  </code>
                </td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <Activity className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No audit events yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;
