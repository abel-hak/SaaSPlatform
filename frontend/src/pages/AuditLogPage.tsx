import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePlan } from '../context/AuthContext';

interface AuditLogItem {
  id: number;
  org_id: string;
  user_id: string | null;
  action: string;
  details: any;
  created_at: string;
}

interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
}

const AuditLogPage: React.FC = () => {
  const plan = usePlan();
  const [data, setData] = useState<AuditLogResponse | null>(null);

  const isEnabled = plan === 'pro' || plan === 'enterprise';

  useEffect(() => {
    if (!isEnabled) return;
    const load = async () => {
      try {
        const res = await api.get<AuditLogResponse>('/audit-log/');
        setData(res.data);
      } catch {
        // ignore
      }
    };
    load();
  }, [isEnabled]);

  if (!isEnabled) {
    return (
      <div className="glass rounded-2xl p-4 text-xs relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4">
          <div className="text-slate-100 font-semibold mb-1">Audit log is locked</div>
          <p className="text-slate-300 mb-3 text-[11px]">
            Upgrade to Pro or Enterprise to unlock full audit logging across invites, uploads, plan changes, and more.
          </p>
          <a
            href="/app/billing"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold px-4 py-1.5"
          >
            View plans
          </a>
        </div>
        <div className="opacity-40 pointer-events-none select-none">
          <div className="text-xs font-semibold text-slate-200 mb-2">Audit log</div>
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="text-xs">
        <div className="text-slate-200 font-semibold">Audit log</div>
        <div className="text-slate-400">
          Review who did what, and when, across your tenant.
        </div>
      </header>

      <div className="glass rounded-2xl overflow-hidden border border-slate-800/80">
        <table className="w-full text-xs">
          <thead className="bg-slate-950/80 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Timestamp</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Details</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-800/60">
                <td className="px-3 py-2 text-slate-400 text-[11px]">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-900/70 border border-slate-700 text-[11px]">
                    {item.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-300 hidden md:table-cell">
                  <code className="bg-slate-900/80 rounded px-2 py-1 block overflow-x-auto">
                    {JSON.stringify(item.details ?? {}, null, 0)}
                  </code>
                </td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-slate-500 text-[11px]">
                  No audit events yet.
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

