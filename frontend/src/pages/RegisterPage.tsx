import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { org_name: orgName, email, password });
      await login(res.data.access_token, res.data.refresh_token);
      toast.success('Workspace created');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="max-w-sm w-full glass rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-2xl bg-gradient-to-tr from-brand-indigo to-brand-violet flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <div>
            <div className="text-sm font-semibold">Create your workspace</div>
            <div className="text-xs text-slate-400">Free for small teams</div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1 text-xs">
            <label className="text-slate-200">Organization name</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
            />
          </div>
          <div className="space-y-1 text-xs">
            <label className="text-slate-200">Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
            />
          </div>
          <div className="space-y-1 text-xs">
            <label className="text-slate-200">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-indigo"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold py-2.5 mt-2 disabled:opacity-60"
          >
            {loading ? 'Creating workspace…' : 'Create workspace'}
          </button>
        </form>
        <div className="mt-4 text-[11px] text-slate-400 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-indigo hover:text-brand-violet">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

