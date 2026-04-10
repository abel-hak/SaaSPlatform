import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useIsAdmin, useIsOwner } from '../hooks/useRole';
import { Building2, Lock, AlertTriangle, Loader2, Shield } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const SettingsPage: React.FC = () => {
  const { me, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const isOwner = useIsOwner();

  const [orgName, setOrgName] = useState(me?.organization.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [aiProvider, setAiProvider] = useState<'groq' | 'openai' | 'anthropic'>(me?.organization.ai_provider ?? 'groq');
  const [aiModel, setAiModel] = useState(me?.organization.ai_model ?? '');
  const [aiApiKey, setAiApiKey] = useState(me?.organization.ai_api_key ?? '');
  const [savingAi, setSavingAi] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateOrg = async () => {
    setSavingOrg(true);
    try {
      await api.patch('/settings/org', { name: orgName });
      toast.success('Organization updated');
    } catch {
      toast.error('Unable to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const updateAiPrefs = async () => {
    setSavingAi(true);
    try {
      await api.patch('/settings/org/ai-prefs', {
        ai_provider: aiProvider,
        ai_model: aiModel || undefined,
        ai_api_key: aiApiKey || undefined,
      });
      toast.success('AI preferences updated');
    } catch {
      toast.error('Unable to update AI preferences');
    } finally {
      setSavingAi(false);
    }
  };

  const changePassword = async () => {
    setSavingPw(true);
    try {
      await api.post('/settings/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const deleteOrg = async () => {
    setDeleteOpen(false);
    try {
      await api.delete('/settings/org');
      logout();
    } catch {
      toast.error('Unable to delete organization');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your workspace and account preferences.</p>
      </div>

      {/* Organization — admin+ only */}
      {isAdmin && (
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Organization</h2>
          </div>
          <div className="h-px bg-surface-border dark:bg-[#424242]" />
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">Name</label>
            <input id="org-name" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input max-w-sm" />
            <p className="mt-1.5 text-xs text-slate-400 dark:text-[#8e8e8e]">Display name for your organization across Aurora.</p>
          </div>
          <div>
            <button onClick={updateOrg} disabled={savingOrg} className="btn-primary text-xs py-2 px-4">
              {savingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save changes'}
            </button>
          </div>
        </section>
      )}

      {/* AI Preferences — owner only */}
      {isOwner && (
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">AI Provider (Bring Your Own Key)</h2>
          </div>
          <div className="h-px bg-surface-border dark:bg-[#424242]" />
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">Provider</label>
              <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as any)} className="input bg-white dark:bg-[#383838]">
                <option value="groq">Groq (Default, Llama 3 Fast)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-3.5)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">Model Name (Optional)</label>
              <input type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="input" placeholder={aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : 'llama3-8b-8192'} />
              <p className="mt-1 text-xs text-slate-400 dark:text-[#8e8e8e]">Leave blank to use default workspace model.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">API Key (Optional)</label>
              <input type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} className="input font-mono text-xs" placeholder="sk-..." />
              <p className="mt-1 text-xs text-slate-400 dark:text-[#8e8e8e]">Paste your own API key to bypass workspace limits.</p>
            </div>
          </div>
          <div>
            <button onClick={updateAiPrefs} disabled={savingAi} className="btn-secondary text-xs py-2 px-4">
              {savingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save AI Preferences'}
            </button>
          </div>
        </section>
      )}

      {/* Password — all users */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Change password</h2>
        </div>
        <div className="h-px bg-surface-border dark:bg-[#424242]" />
        <div className="space-y-3 max-w-sm">
          <div>
            <label htmlFor="current-pw" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">Current password</label>
            <input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <div>
            <label htmlFor="new-pw" className="block text-sm font-medium text-slate-700 dark:text-[#d4d4d4] mb-1.5">New password</label>
            <input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="8+ characters" minLength={8} />
          </div>
        </div>
        <div>
          <button onClick={changePassword} disabled={savingPw || !currentPassword || !newPassword} className="btn-secondary text-xs py-2 px-4">
            {savingPw ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update password'}
          </button>
        </div>
      </section>

      {/* Danger zone — owner only */}
      {isOwner && (
        <section className="card p-6 space-y-4 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          </div>
          <div className="h-px bg-red-100 dark:bg-red-900/30" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">Delete organization</p>
              <p className="text-xs text-slate-500 dark:text-[#9a9a9a] mt-0.5">Permanently deletes all data. This cannot be undone.</p>
            </div>
            <button onClick={() => setDeleteOpen(true)} className="btn-danger text-xs py-2 px-4 whitespace-nowrap flex-shrink-0">
              Delete organization
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete organization"
        description="This will permanently delete your organization and all its data — documents, conversations, billing, and team members. This cannot be undone."
        confirmLabel="Delete everything"
        variant="danger"
        onConfirm={() => void deleteOrg()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
