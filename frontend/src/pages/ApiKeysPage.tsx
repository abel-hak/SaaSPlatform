import React, { useCallback, useEffect, useState } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useIsAdmin } from '../hooks/useRole';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const ApiKeysPage: React.FC = () => {
  const isAdmin = useIsAdmin();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ keys: ApiKeyItem[] }>('/api-keys/');
      setKeys(res.data.keys);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/api-keys/', { name: newName.trim() });
      setRevealedKey(res.data.key);
      setCreateOpen(false);
      setNewName('');
      await load();
      toast.success('API key created');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to create API key');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    const id = revokeTarget.id;
    const previous = [...keys];
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setRevokeTarget(null);
    try {
      await api.delete(`/api-keys/${id}`);
      toast.success('API key revoked');
    } catch {
      setKeys(previous);
      toast.error('Unable to revoke key');
    }
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Generate keys for programmatic access to Aurora's API."
        actions={
          isAdmin ? (
            <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm py-2 px-4">
              <Plus className="w-4 h-4" /> Create key
            </button>
          ) : undefined
        }
      />

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                Copy your API key now — it won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white dark:bg-[#2a2a2a] border border-surface-border dark:border-[#424242] rounded-lg px-3 py-2 truncate text-slate-800 dark:text-white">
                  {revealedKey}
                </code>
                <button onClick={() => void copyKey()} className="btn-secondary !py-2 !px-3 text-xs flex-shrink-0">
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button onClick={() => setRevealedKey(null)} className="btn-ghost !p-1 flex-shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle dark:bg-[#2f2f2f] border-b border-surface-border dark:border-[#424242]">
              <th className="table-head">Name</th>
              <th className="table-head">Key</th>
              <th className="table-head hidden md:table-cell">Created</th>
              <th className="table-head hidden md:table-cell">Last used</th>
              {isAdmin && <th className="table-head text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2].map((i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell"><div className="skeleton h-4 w-32" /></td>
                    <td className="table-cell"><div className="skeleton h-4 w-24" /></td>
                    <td className="table-cell hidden md:table-cell"><div className="skeleton h-4 w-20" /></td>
                    <td className="table-cell hidden md:table-cell"><div className="skeleton h-4 w-20" /></td>
                    {isAdmin && <td className="table-cell" />}
                  </tr>
                ))
              : keys.map((k) => (
                  <tr key={k.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-800 dark:text-white font-medium">{k.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <code className="text-xs font-mono text-slate-500 dark:text-[#8e8e8e]">
                        {k.key_prefix}••••••••
                      </code>
                    </td>
                    <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    {isAdmin && (
                      <td className="table-cell text-right">
                        <button
                          onClick={() => setRevokeTarget(k)}
                          className="btn-ghost !p-1.5 text-slate-400 hover:text-red-500"
                          aria-label={`Revoke ${k.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            {!loading && keys.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4}>
                  <EmptyState
                    icon={Key}
                    title="No API keys"
                    description="Create an API key to access Aurora programmatically."
                    action={
                      isAdmin ? (
                        <button onClick={() => setCreateOpen(true)} className="btn-primary text-xs py-1.5 px-3">
                          <Plus className="w-3.5 h-3.5" /> Create key
                        </button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="dialog-overlay" onClick={() => setCreateOpen(false)}>
          <div className="dialog-panel max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Create API key</h2>
              <button onClick={() => setCreateOpen(false)} className="btn-ghost !p-1" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="key-name" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">
                  Key name
                </label>
                <input
                  id="key-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && create()}
                  className="input"
                  placeholder="e.g. CI/CD pipeline"
                  autoFocus
                />
                <p className="text-xs text-slate-400 dark:text-[#8e8e8e] mt-1">A label to help you identify this key later.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setCreateOpen(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                <button disabled={creating || !newName.trim()} onClick={() => void create()} className="btn-primary text-sm py-2 px-4">
                  {creating ? 'Creating…' : 'Create key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke API key"
        description={`Revoke "${revokeTarget?.name}"? Any applications using this key will immediately lose access.`}
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={() => void revoke()}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
};

export default ApiKeysPage;
