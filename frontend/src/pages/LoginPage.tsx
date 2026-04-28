import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      await login(res.data.access_token, res.data.refresh_token);
      toast.success('Welcome back!');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.4)_0%,_transparent_60%)] pointer-events-none" />
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
        <div className="relative space-y-6">
          <blockquote className="text-white/90 text-xl font-medium leading-relaxed">
            &quot;Aurora helped our team cut research time in half. The AI understands our documents better than we expected.&quot;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">JM</div>
            <div>
              <div className="text-white font-medium text-sm">Jamie Morris</div>
              <div className="text-white/60 text-xs">Head of Product, Acme Inc.</div>
            </div>
          </div>
        </div>
        <div className="relative flex gap-2">
          {['SOC 2', 'GDPR', 'ISO 27001'].map((label) => (
            <span key={label} className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
              {label}
            </span>
          ))}
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
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your workspace to continue.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
