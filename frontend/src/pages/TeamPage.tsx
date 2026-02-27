import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth, usePlan } from '../context/AuthContext';

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

const TeamPage: React.FC = () => {
  const { me } = useAuth();
  const plan = usePlan();
  const [data, setData] = useState<MemberListResponse | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<MemberListResponse>('/team/');
      setData(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const remove = async (id: string) => {
    if (!confirm('Remove this member?')) return;
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
    <div className="space-y-5">
      <header className="flex items-center justify-between text-xs">
        <div>
          <div className="text-slate-200 font-semibold">Team</div>
          <div className="text-slate-400">
            Manage workspace members and roles. Seats are enforced per plan.
          </div>
        </div>
        <button
          disabled={!canManage || atSeatLimit}
          onClick={() => setInviteOpen(true)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
            atSeatLimit
              ? 'bg-slate-900 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-indigo to-brand-violet text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite member
        </button>
      </header>

      {atSeatLimit && (
        <div className="glass border-amber-500/40 bg-amber-950/40 text-amber-100 px-4 py-3 rounded-2xl text-xs flex justify-between">
          <div>
            <div className="font-semibold">You&apos;ve reached your team seat limit.</div>
            <div className="text-amber-100/90">
              Upgrade to a higher plan to invite more members. Current usage: {data?.seats_used} / {data?.seats_limit}.
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden border border-slate-800/80">
        <table className="w-full text-xs">
          <thead className="bg-slate-950/80 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Member</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Joined</th>
              <th className="px-3 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {data?.members.map((m) => (
              <tr key={m.id} className="border-t border-slate-800/60">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-200">
                      {m.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-slate-100 text-xs">{m.email}</div>
                      <div className="text-[11px] text-slate-500">Member</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className="bg-slate-900/80 border border-slate-700 rounded-full px-2 py-1 text-[11px]"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className="capitalize">{m.role}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 text-[11px]">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {canManage && me?.user.id !== m.id && (
                    <button
                      onClick={() => remove(m.id)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 hover:bg-slate-900"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {(!data || data.members.length === 0) && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500 text-[11px]">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="glass rounded-2xl p-4 w-full max-w-sm text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-slate-100">Invite member</div>
              <button onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-100 text-xs">
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-200">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-200">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setInviteOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  onClick={() => void invite()}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold"
                >
                  Send invite
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

