import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import Logo from '@/components/ui/Logo';
import ToneSelector from '@/components/ui/ToneSelector';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

const Pending = () => {
  const { user, profile, isPending, isApproved, loading, signOut, refreshProfile } = useAuth();
  const { t } = useTone();

  // Auto-refresh profile every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshProfile();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  if (profile?.student_status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col bg-background bg-pattern">
        <header className="flex justify-between items-center p-6">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <ToneSelector />
            <button
              onClick={signOut}
              className="btn-ghost flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-8">
              <span className="text-5xl">😔</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              Application Rejected
            </h1>
            <p className="text-muted-foreground">
              Unfortunately, your application was not approved. Please contact your teacher for more information.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <ToneSelector />
          <button
            onClick={signOut}
            className="btn-ghost flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t.logout}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg text-center animate-fade-in">
          {/* Animated Clock Icon */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Clock className="w-16 h-16 text-primary animate-pulse" />
            </div>
          </div>

          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            {t.pendingApproval}
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {t.pendingDescription}
          </p>

          {/* Status Card */}
          <div className="card-premium p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold text-foreground">{profile?.full_name}</p>
              </div>
              <span className="badge-pending">Pending</span>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshProfile}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Check Status
          </button>

          <p className="mt-6 text-sm text-muted-foreground">
            {t.waitMessage}
          </p>
        </div>
      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float delay-500" />
      </div>
    </div>
  );
};

export default Pending;
