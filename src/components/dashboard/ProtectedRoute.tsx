import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, isApproved } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-600 border-t-neutral-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !isApproved) {
    return <Navigate to="/dashboard/login" replace />;
  }

  return <>{children}</>;
}
