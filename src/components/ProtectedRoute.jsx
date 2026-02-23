import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, requireCircle = true }) {
  const { isAuthenticated, userDoc, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-900">
        <img
          src="/circle_of_care.png"
          alt="Circle of Care"
          className="h-32 w-auto animate-pulse"
        />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireCircle && !userDoc?.circleId) {
    return <Navigate to="/onboarding/create-circle" replace />;
  }

  return children;
}
