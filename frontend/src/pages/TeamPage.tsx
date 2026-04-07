import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Member {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface MemberListResponse {
  members: Member[];
  seats_used: number;
  seats_limit: number | null;
}

const roleColors: Record<string, string> = {
  owner:  'badge-brand',
  admin:  'badge-brand',
  member: 'badge-neutral',
};

const TeamPage: React.FC = () => {
  const { me } = useAuth();
  const [data, setData] = useState<MemberListResponse | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<MemberListResponse>('/team/');
      setData(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const atSeatLimit = data?.seats_limit != null && data.seats_used >= data.seats_limit;
  const canManage = me?.user.role === 'owner' || me?.user.role === 'admin';

  const invite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const res = await api.post(
        '/team/invites',
        { email: inviteEmail, role: inviteRole },
        { validateStatus: () => true }
      );
      if (res.status === 202 || res.status === 200) {
        toast.success('Invite sent successfully');
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

  const remove = async (id: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await api.delete(`/team/members/${id}`);
      toast.success('Member removed');
      await load();
    } catch {
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">Manage workspace members and their roles.</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="badge-neutral text-xs">
              {data.seats_used}{data.seats_limit ? ` / ${data.seats_limit}` : ''} seats
            </span>
          )}
          {canManage && (
            <button
              onClick={() => setInviteOpen(true)}
              disabled={atSeatLimit}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Invite member
            </button>
          )}
        </div>
      </div>

      {/* Seat limit warning */}
      {atSeatLimit && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Seat limit reached</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              You're at {data?.seats_used} / {data?.seats_limit} seats. Upgrade your plan to invite more members.
            </p>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle dark:bg-[#2f2f2f] border-b border-surface-border dark:border-[#424242]">
              <th className="table-head">Member</th>
              <th className="table-head">Role</th>
              <th className="table-head hidden md:table-cell">Joined</th>
              {canManage && <th className="table-head text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.members.map((m) => {
              const isMe = me?.user.email === m.email;
              return (
                <tr key={m.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-[#383838] text-brand-700 dark:text-[#a5b4fc] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {m.email[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-white">{m.email}</div>
                        {isMe && <div className="text-xs text-slate-400">You</div>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    {canManage && !isMe ? (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="input max-w-[120px] py-1 text-xs"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span className={roleColors[m.role] ?? 'badge-neutral'}>
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td className="table-cell text-right">
                      {!isMe && (
                        <button
                          onClick={() => remove(m.id)}
                          className="btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {(!data || data.members.length === 0) && (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No members yet. Invite your first teammate.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-card dark:bg-[#2f2f2f] rounded-2xl shadow-dialog p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Invite team member</h2>
              <button
                onClick={() => setInviteOpen(false)}
                className="btn-ghost p-1.5 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  autoFocus
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="input"
                >
                  <option value="member">Member — can view and chat</option>
                  <option value="admin">Admin — can manage team & documents</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setInviteOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  disabled={loading || !inviteEmail}
                  onClick={() => void invite()}
                  className="btn-primary flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
