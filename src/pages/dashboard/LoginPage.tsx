import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import LoadingSpinner, { LoadingScreen } from '../../components/dashboard/ui/LoadingSpinner';
import { resetConciergeEntranceForLogin } from '../../components/dashboard/ui/ConciergeSignatureEntrance';
import { safeCrmDestination } from '../../lib/crmDeepLinks';

export default function LoginPage() {
  const { session, loading, isApproved, authError, retrySession, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Preserve exact, allowlisted notification targets across authentication.
  const loginDestination = safeCrmDestination((location.state as {from?:unknown}|null)?.from)
    ?? safeCrmDestination(new URLSearchParams(location.search).get('returnTo')) ?? '/dashboard';

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const autoSignInAttempted = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && isApproved) {
      resetConciergeEntranceForLogin();
      navigate(loginDestination, { replace: true });
    }
  }, [loading, session, isApproved, navigate, loginDestination]);

  // Safari's password manager may fill native DOM fields without dispatching
  // React onChange events. Sign in once when both fields are genuinely autofilled;
  // ordinary manual typing must still require the Sign in button.
  useEffect(() => {
    if (loading || session || submitting || error || autoSignInAttempted.current) return;
    const check = () => {
      const username = emailRef.current;
      const secret = passwordRef.current;
      if (!username?.value.trim() || !secret?.value || autoSignInAttempted.current) return;
      const isAutofilled = (field: HTMLInputElement) => {
        try { return field.matches(':autofill, :-webkit-autofill'); }
        catch { return false; }
      };
      if (!isAutofilled(secret)) return;
      autoSignInAttempted.current = true;
      setEmail(username.value);
      setPassword(secret.value);
      setSubmitting(true);
      void signIn(username.value.trim(), secret.value).then(({ error: signInError }) => {
        if (signInError) {
          setError('Invalid email or password.');
          setSubmitting(false);
        }
      });
    };
    const interval = window.setInterval(check, 150);
    check();
    return () => window.clearInterval(interval);
  }, [loading, session, submitting, error, signIn]);

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

      <div className="relative w-full max-w-sm animate-ds-fade-up pt-6 -top-[30px] lg:top-0">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-12">
          <div
            className="mb-5 p-2.5 rounded-2xl h-[124px] w-[124px] flex items-center justify-center"
            style={{ background: 'rgba(245,237,220,0.92)', boxShadow: '0 0 0 1px rgba(196,164,106,0.3)' }}
          >
            <img
              src="/images/md-logo.png"
              alt="Missy Dours"
              className="h-full w-full object-contain"
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
            {authError && <div role="alert" className="text-sm text-amber-200">{authError} <button type="button" onClick={() => void retrySession()} className="underline">Retry</button></div>}

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
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-2.5 text-base sm:text-sm placeholder:text-[#3a3836] disabled:opacity-50 outline-none transition-all duration-200"
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
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-base sm:text-sm placeholder:text-[#3a3836] disabled:opacity-50 outline-none transition-all duration-200"
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
