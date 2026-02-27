import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const SettingsPage: React.FC = () => {
  const { me, logout } = useAuth();
  const [orgName, setOrgName] = useState(me?.organization.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const updateOrg = async () => {
    try {
      await api.patch('/settings/org', { name: orgName });
      toast.success('Organization updated');
    } catch {
      toast.error('Unable to update organization');
    }
  };

  const changePassword = async () => {
    try {
      await api.post('/settings/profile/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to change password');
    }
  };

  const deleteOrg = async () => {
    if (!confirm('This will permanently delete your organization and all data. Continue?')) return;
    try {
      await api.delete('/settings/org');
      logout();
      toast.success('Organization deleted');
    } catch {
      toast.error('Unable to delete organization');
    }
  };

  return (
    <div className="space-y-6">
      <header className="text-xs">
        <div className="text-slate-200 font-semibold">Settings</div>
        <div className="text-slate-400">Update workspace details and your profile.</div>
      </header>

      <section className="glass rounded-2xl p-4 text-xs space-y-3">
        <div className="font-semibold text-slate-100 mb-1">Organization</div>
        <div className="space-y-1">
          <label className="text-slate-300">Name</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
          />
        </div>
        <button
          onClick={updateOrg}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold px-4 py-1.5"
        >
          Save changes
        </button>
      </section>

      <section className="glass rounded-2xl p-4 text-xs space-y-3">
        <div className="font-semibold text-slate-100 mb-1">Change password</div>
        <div className="space-y-1">
          <label className="text-slate-300">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-300">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
          />
        </div>
        <button
          onClick={changePassword}
          className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-700 text-xs font-semibold px-4 py-1.5"
        >
          Update password
        </button>
      </section>

      <section className="glass rounded-2xl p-4 text-xs space-y-2 border border-rose-600/40 bg-rose-950/20">
        <div className="font-semibold text-rose-200 mb-1">Danger zone</div>
        <p className="text-rose-100/90">
          Deleting your organization is permanent. All documents, conversations, and billing records will be removed.
        </p>
        <button
          onClick={deleteOrg}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-rose-600 text-xs font-semibold px-4 py-1.5"
        >
          Delete organization
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;

