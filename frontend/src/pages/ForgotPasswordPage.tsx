import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/password/reset', { email });
      setSent(true);
    } catch {
      setSent(true);
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
          <Mail className="w-12 h-12 text-white/60" />
          <h2 className="text-white text-2xl font-bold">Check your email</h2>
          <p className="text-white/70 text-base max-w-md">
            We'll send you a secure link to reset your password. The link expires after 1 hour.
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

          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
              <p className="text-sm text-slate-500">
                If an account exists for <strong className="text-slate-700">{email}</strong>, we've sent a password reset link. It expires in 1 hour.
              </p>
              <p className="text-xs text-slate-400 mt-4">
                Didn't get the email? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} className="text-brand-600 hover:text-brand-700 font-medium">
                  try again
                </button>.
              </p>
              <Link to="/login" className="btn-secondary text-sm py-2 px-4 mt-4 inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Enter the email address associated with your account and we'll send a reset link.
                </p>
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

                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : 'Send reset link'}
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

export default ForgotPasswordPage;
