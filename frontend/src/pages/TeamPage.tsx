import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import type { MemberListResponse, Member } from '../lib/types';
import { useAuth, usePlan } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const TeamPage: React.FC = () => {
  const { me } = useAuth();
  const plan = usePlan();
  const [data, setData] = useState<MemberListResponse | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<MemberListResponse>('/team/');
      setData(res.data);
    } catch {
      /* ignore */
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const atSeatLimit = data?.seats_limit != null && data.seats_used >= data.seats_limit;
  const canManage = me?.user.role === 'owner' || me?.user.role === 'admin';

  const invite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const res = await api.post('/team/invites', { email: inviteEmail, role: inviteRole }, { validateStatus: () => true });
      if (res.status === 202 || res.status === 200) {
        toast.success('Invite sent');
        setInviteOpen(false);
        setInviteEmail('');
        await load();
      } else if (res.status === 429) {
        toast.error(res.data.detail ?? 'Seat limit reached.');
      } else {
        toast.error(res.data?.detail ?? 'Unable to send invite');
      }
    } catch {
      toast.error('Unable to send invite');
    } finally {
      setLoading(false);
    }
  };

  /* Optimistic remove */
  const confirmRemove = async () => {
    if (!removeTarget || !data) return;
    const id = removeTarget.id;
    const previous = { ...data };
    setData({ ...data, members: data.members.filter((m) => m.id !== id), seats_used: data.seats_used - 1 });
    setRemoveTarget(null);
    try {
      await api.delete(`/team/members/${id}`);
      toast.success('Member removed');
    } catch {
      setData(previous);
      toast.error('Unable to remove member');
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await api.patch(`/team/members/${id}/role`, { role });
      toast.success('Role updated');
      await load();
    } catch {
      toast.error('Unable to update role');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Manage workspace members and roles. Seats are enforced per plan."
        actions={
          <button
            disabled={!canManage || atSeatLimit}
            onClick={() => setInviteOpen(true)}
            className="btn-primary text-sm py-2 px-4"
          >
            <UserPlus className="w-4 h-4" />
            Invite member
          </button>
        }
      />

      {atSeatLimit && (
        <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">You've reached your team seat limit.</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            Upgrade to a higher plan. Current: {data?.seats_used} / {data?.seats_limit}.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle dark:bg-[#2f2f2f] border-b border-surface-border dark:border-[#424242]">
              <th className="table-head">Member</th>
              <th className="table-head">Role</th>
              <th className="table-head hidden md:table-cell">Joined</th>
              <th className="table-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageLoading
              ? [1, 2].map((i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell"><div className="skeleton h-4 w-40" /></td>
                    <td className="table-cell"><div className="skeleton h-4 w-16" /></td>
                    <td className="table-cell hidden md:table-cell"><div className="skeleton h-4 w-20" /></td>
                    <td className="table-cell" />
                  </tr>
                ))
              : data?.members.map((m) => (
                  <tr key={m.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-semibold text-brand-700 dark:text-brand-300">
                          {m.email[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-white">{m.email}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {canManage ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          className="input !w-auto !py-1 !px-2 text-xs"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className="badge-neutral capitalize">{m.role}</span>
                      )}
                    </td>
                    <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-right">
                      {canManage && me?.user.id !== m.id && (
                        <button
                          onClick={() => setRemoveTarget(m)}
                          className="btn-ghost !p-1.5 text-slate-400 hover:text-red-500"
                          aria-label={`Remove ${m.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            {!pageLoading && (!data || data.members.length === 0) && (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={Users} title="No members yet" description="Invite team members to get started." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="dialog-overlay" onClick={() => setInviteOpen(false)}>
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Invite member</h2>
              <button onClick={() => setInviteOpen(false)} className="btn-ghost !p-1" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">Email</label>
                <input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input" placeholder="colleague@company.com" />
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">Role</label>
                <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')} className="input">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInviteOpen(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                <button disabled={loading} onClick={() => void invite()} className="btn-primary text-sm py-2 px-4">Send invite</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member"
        description={`Remove ${removeTarget?.email} from this workspace? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
};

export default TeamPage;
