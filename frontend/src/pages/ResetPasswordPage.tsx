import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4 animate-fade-in">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Invalid reset link</h1>
          <p className="text-sm text-slate-500">
            This link is missing a reset token. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary text-sm py-2 px-4 inline-flex">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password/reset/confirm', { token, new_password: password });
      setDone(true);
      toast.success('Password reset successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Invalid or expired reset link');
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
        <div className="relative space-y-4">
          <Lock className="w-12 h-12 text-white/60" />
          <h2 className="text-white text-2xl font-bold">Set a new password</h2>
          <p className="text-white/70 text-base max-w-md">
            Choose a strong password with at least 8 characters to secure your account.
          </p>
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
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9"/>
                <circle cx="9" cy="9" r="2.5" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Aurora Workspace</span>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Password updated</h1>
              <p className="text-sm text-slate-500">
                Your password has been reset. You can now sign in with your new credentials.
              </p>
              <button onClick={() => navigate('/login')} className="btn-primary text-sm py-2 px-4 mt-2">
                Sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Create new password</h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Your new password must be at least 8 characters long.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                  />
                  {confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || password !== confirm} className="btn-primary w-full mt-2">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
                  ) : 'Reset password'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
