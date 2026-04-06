import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';

const perks = [
  'AI assistant grounded in your own documents',
  'Unlimited team members on Enterprise',
  'SOC 2 compliant infrastructure',
  'Start free — no credit card required',
];

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
      toast.success('Workspace created — welcome!');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Unable to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.4)_0%,_transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9"/>
                <circle cx="9" cy="9" r="2.5" fill="white"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Aurora Workspace</span>
          </div>
        </div>
        <div className="relative space-y-8">
          <h2 className="text-white text-2xl font-bold leading-snug">
            Your AI-powered<br/>knowledge base
          </h2>
          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-white/85 text-sm">
                <CheckCircle2 className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-white/50 text-xs">
          © {new Date().getFullYear()} Aurora Workspace
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9"/>
                <circle cx="9" cy="9" r="2.5" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Aurora Workspace</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Create your workspace</h1>
            <p className="mt-1.5 text-sm text-slate-500">Free for small teams. No credit card required.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Organization name
              </label>
              <input
                id="org-name"
                type="text"
                required
                autoFocus
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Inc."
                className="input"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                minLength={8}
                className="input"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace…</>
              ) : 'Create free workspace'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            By creating an account you agree to our{' '}
            <span className="underline cursor-pointer hover:text-slate-600">Terms</span> and{' '}
            <span className="underline cursor-pointer hover:text-slate-600">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
