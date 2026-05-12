import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from './ui/LoadingSpinner';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, isApproved } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session || !isApproved) {
    return <Navigate to="/dashboard/login" replace />;
  }

  return <>{children}</>;
}
