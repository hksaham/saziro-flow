import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireApproved?: boolean;
  requireOnboarded?: boolean;
  allowedRoles?: ('teacher' | 'student')[];
}

const ProtectedRoute = ({
  children,
  requireApproved = true,
  requireOnboarded = true,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { user, profile, loading, isPending, isOnboarded, isStudent, coachingId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Loader2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No profile yet (still creating)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Student needs onboarding - redirect to onboarding
  if (requireOnboarded && isStudent && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  // Pending student - redirect to pending page
  if (requireApproved && isPending) {
    return <Navigate to="/pending" replace />;
  }

  // Check role restrictions
  if (allowedRoles && profile.role && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Student must have an active coaching (approved membership verified by AuthContext)
  if (isStudent && requireApproved && !coachingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Coaching Joined</h2>
          <p className="text-muted-foreground">
            You have not joined any coaching yet. Ask your teacher for an invite link.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
