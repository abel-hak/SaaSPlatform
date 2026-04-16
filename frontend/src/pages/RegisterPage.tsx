import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
    if (pw.length === 0) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 3, label: 'Fair', color: 'bg-amber-500' };
    return { score: 5, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

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
    <div className="min-h-screen bg-surface-page flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.4)_0%,_transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9" />
                <circle cx="9" cy="9" r="2.5" fill="white" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Aurora Workspace</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <blockquote className="text-white/90 text-xl font-medium leading-relaxed">
            "We set up our entire AI workspace in under 5 minutes. Documents indexed, team invited, assistant ready."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
              SK
            </div>
            <div>
              <div className="text-white font-medium text-sm">Sarah Kim</div>
              <div className="text-white/60 text-xs">CTO, Nexus Labs</div>
            </div>
          </div>
        </div>
        <div className="relative flex gap-2">
          {['Free tier', 'No credit card', 'SOC 2'].map((label) => (
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
                <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity="0.9" />
                <circle cx="9" cy="9" r="2.5" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Aurora Workspace</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Create your workspace</h1>
            <p className="mt-1.5 text-sm text-slate-500">Free for individuals and small teams.</p>
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                className="input"
              />
              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          strength.score >= level * 1.5
                            ? strength.color
                            : 'bg-slate-200 dark:bg-[#424242]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.label === 'Weak' ? 'text-red-500' :
                    strength.label === 'Fair' ? 'text-amber-500' : 'text-emerald-600'
                  }`}>{strength.label}</p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || password.length < 8} className="btn-primary w-full mt-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating workspace…
                </>
              ) : (
                'Create workspace'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
