import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import LoadingSpinner, { LoadingScreen } from '../../components/dashboard/ui/LoadingSpinner';

export default function LoginPage() {
  const { session, loading, isApproved, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && isApproved) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, session, isApproved, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError('Invalid email or password.');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div
      className="ds-shell min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--ds-bg-base)' }}
    >
      {/* Subtle ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(196,164,106,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm animate-ds-fade-up">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="mb-5 p-3 rounded-2xl"
            style={{ background: 'var(--ds-bg-raised)', boxShadow: 'var(--ds-shadow-card)' }}
          >
            <img
              src="/images/md-logo.png"
              alt="Missy Dours"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--ds-text-primary)' }}
          >
            Missy Dours
          </h1>
          <p
            className="text-sm mt-1 tracking-wide"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Private dashboard access
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-7"
          style={{ background: 'var(--ds-bg-raised)', boxShadow: 'var(--ds-shadow-float)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-medium tracking-[0.14em] uppercase mb-1.5"
                style={{ color: 'var(--ds-text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-[#3a3836] disabled:opacity-50 outline-none transition-all duration-200"
                style={{
                  background: 'var(--ds-bg-overlay)',
                  color: 'var(--ds-text-primary)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
                onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-medium tracking-[0.14em] uppercase mb-1.5"
                style={{ color: 'var(--ds-text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm placeholder:text-[#3a3836] disabled:opacity-50 outline-none transition-all duration-200"
                  style={{
                    background: 'var(--ds-bg-overlay)',
                    color: 'var(--ds-text-primary)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                  }}
                  onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
                  onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-xs"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  color: '#fca5a5',
                  boxShadow: '0 0 0 1px rgba(239,68,68,0.2)',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full rounded-xl py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              style={{
                background: 'linear-gradient(135deg, #d4b47a 0%, #C4A46A 50%, #a8894f 100%)',
                color: 'var(--ds-text-inverse)',
                boxShadow: submitting || !email || !password
                  ? 'none'
                  : '0 4px 16px rgba(196,164,106,0.25)',
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-8"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          Access restricted to authorized users.
        </p>
      </div>
    </div>
  );
}
