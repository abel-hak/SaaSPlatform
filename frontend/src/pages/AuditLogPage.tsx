import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePlan } from '../context/AuthContext';
import { useIsAdmin } from '../hooks/useRole';
import { Lock, Activity, Download, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

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
  login: 'badge-brand',
  ai_query: 'badge-brand',
  document_uploaded: 'badge-success',
  document_deleted: 'badge-warn',
  member_invited: 'badge-success',
  member_removed: 'badge-danger',
  role_changed: 'badge-warn',
  org_updated: 'badge-neutral',
  org_deleted: 'badge-danger',
  ai_prefs_updated: 'badge-neutral',
  limit_hit: 'badge-danger',
  api_key_created: 'badge-success',
  api_key_revoked: 'badge-warn',
};

const AuditLogPage: React.FC = () => {
  const plan = usePlan();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const isEnabled = plan === 'pro' || plan === 'enterprise';

  useEffect(() => {
    if (!isEnabled) {
      setLoading(false);
      return;
    }
    api
      .get<AuditLogResponse>('/audit-log/')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isEnabled]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/audit-log/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit log exported');
    } catch {
      toast.error('Unable to export');
    } finally {
      setExporting(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Review who did what, and when, across your workspace.</p>
        </div>
        <div className="card p-12 flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-surface-subtle dark:bg-[#383838] flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800 dark:text-white">Audit log is a Pro+ feature</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#9a9a9a] max-w-sm">
              Upgrade to Pro or Enterprise to track invites, uploads, plan changes, and all user activity.
            </p>
          </div>
          <Link to="/app/billing" className="btn-primary text-sm py-2 px-5">View plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Review who did what, and when, across your workspace."
        actions={
          <div className="flex items-center gap-2">
            {data && <span className="badge-neutral">{data.total} events</span>}
            {isAdmin && (
              <button onClick={() => void exportCsv()} disabled={exporting} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export CSV
              </button>
            )}
          </div>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle dark:bg-[#2f2f2f] border-b border-surface-border dark:border-[#424242]">
              <th className="table-head">Timestamp</th>
              <th className="table-head">Action</th>
              <th className="table-head hidden md:table-cell">User</th>
              <th className="table-head hidden lg:table-cell">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3].map((i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell"><div className="skeleton h-4 w-32" /></td>
                    <td className="table-cell"><div className="skeleton h-4 w-20" /></td>
                    <td className="table-cell hidden md:table-cell"><div className="skeleton h-4 w-16" /></td>
                    <td className="table-cell hidden lg:table-cell"><div className="skeleton h-4 w-40" /></td>
                  </tr>
                ))
              : data?.items.map((item) => (
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
                      <code className="text-xs bg-surface-subtle dark:bg-[#383838] px-2 py-1 rounded text-slate-600 dark:text-[#d4d4d4] block max-w-xs truncate">
                        {JSON.stringify(item.details ?? {})}
                      </code>
                    </td>
                  </tr>
                ))}
            {!loading && (!data || data.items.length === 0) && (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <Activity className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-[#8e8e8e]">No audit events yet.</p>
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
