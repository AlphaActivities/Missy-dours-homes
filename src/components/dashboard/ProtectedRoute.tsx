import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from './ui/LoadingSpinner';
import { safeCrmDestination } from '../../lib/crmDeepLinks';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, authError, retrySession, isApproved } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (authError && !session) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{background:'var(--ds-bg-base)',color:'var(--ds-text-primary)'}}>
      <p role="alert">{authError}</p>
      <button type="button" onClick={() => void retrySession()} className="rounded-lg px-5 py-2 text-sm" style={{background:'var(--ds-gold)',color:'#0c0a08'}}>Retry connection</button>
    </div>
  );

  if (!session || !isApproved) {
    return <Navigate to="/dashboard/login" state={{ from: safeCrmDestination(location.pathname + location.search) ?? "/dashboard" }} replace />;
  }

  return <>{children}</>;
}
