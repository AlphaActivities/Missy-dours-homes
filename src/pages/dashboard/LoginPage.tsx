import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const { session, loading, isApproved, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect already-authenticated approved users
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
      return;
    }

    // onAuthStateChange will update context; useEffect above handles redirect
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-600 border-t-neutral-200 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {/* Logo / wordmark */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 mb-5">
              <Lock size={17} className="text-neutral-300" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Missy Dours</h1>
            <p className="text-sm text-neutral-500 mt-1">Dashboard access</p>
          </div>

          {/* Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-neutral-400 mb-1.5 tracking-wide uppercase">
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
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600
                    focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500
                    disabled:opacity-50 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-neutral-400 mb-1.5 tracking-wide uppercase">
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
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 pr-11 text-sm text-neutral-100 placeholder-neutral-600
                      focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500
                      disabled:opacity-50 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2.5">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !email || !password}
                className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-sm py-2.5 rounded-lg
                  transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-neutral-700 mt-8">
            Access restricted to authorized users only.
          </p>
        </div>
      </div>
    </>
  );
}
