import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/ui/Logo';
import ToneSelector from '@/components/ui/ToneSelector';
import { LogOut, Copy, Check, Users, UserCheck, UserX, Loader2, Bell, X } from 'lucide-react';
import StatusCard from '@/components/student/StatusCard';
import ActionButton from '@/components/student/ActionButton';
import FeatureCard from '@/components/student/FeatureCard';
import PerformanceCard from '@/components/student/PerformanceCard';
import NotificationsCard from '@/components/student/NotificationsCard';

interface PendingStudent {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
}

interface Coaching {
  id: string;
  name: string;
  invite_token: string;
}
/**
 * Skeleton Phase - Placeholder Data
 * Future Hook Notes:
 * - XP → /users/{id}/xp
 * - Streak → /users/{id}/streak
 * - Performance → /performance/{date}
 * - Notifications → /notifications/{userId}
 */
const xp = 0;
const streak = 0;
const mcqsToday = 0;

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut, coachingId, isTeacher } = useAuth();
  const { t } = useTone();
  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (isTeacher && coachingId) {
      fetchCoachingData();
    } else {
      setLoading(false);
    }
  }, [isTeacher, coachingId]);

  const fetchCoachingData = async () => {
    if (!coachingId) return;

    try {
      // Fetch coaching details
      const { data: coachingData, error: coachingError } = await supabase
        .from('coachings')
        .select('*')
        .eq('id', coachingId)
        .single();

      if (coachingError) throw coachingError;
      setCoaching(coachingData);

      // Fetch pending students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, created_at')
        .eq('coaching_id', coachingId)
        .eq('role', 'student')
        .eq('student_status', 'pending');

      if (studentsError) throw studentsError;
      setPendingStudents(studentsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (coaching?.invite_token) {
      const inviteUrl = `${window.location.origin}/signup?token=${coaching.invite_token}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStudentStatus = async (studentId: string, status: 'approved' | 'rejected') => {
    setProcessingId(studentId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ student_status: status })
        .eq('id', studentId);

      if (error) throw error;

      // Remove from pending list
      setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      console.error('Error updating student status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t.welcome.replace('!', `, ${profile?.full_name}!`)}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isTeacher ? 'Manage your coaching center' : 'Start learning'}
            </p>
          </div>

          {/* Teacher View */}
          {isTeacher && coaching && (
            <>
              {/* Invite Link Card */}
              <div className="card-premium p-6 animate-slide-in">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      {t.inviteLink}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Share this link with students to invite them to your coaching
                    </p>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="btn-primary flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
                  <code className="text-sm text-muted-foreground break-all">
                    {`${window.location.origin}/signup?token=${coaching.invite_token}`}
                  </code>
                </div>
              </div>

              {/* Pending Students Card */}
              <div className="card-premium p-6 animate-slide-in delay-100">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                  <UserCheck className="w-5 h-5 text-primary" />
                  {t.pendingStudents}
                  {pendingStudents.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-sm">
                      {pendingStudents.length}
                    </span>
                  )}
                </h2>

                {pendingStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">{t.noStudents}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {student.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(student.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStudentStatus(student.id, 'approved')}
                            disabled={processingId === student.id}
                            className="px-4 py-2 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {processingId === student.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">{t.approveStudent}</span>
                          </button>
                          <button
                            onClick={() => handleStudentStatus(student.id, 'rejected')}
                            disabled={processingId === student.id}
                            className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {processingId === student.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">{t.rejectStudent}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Student View - Full Dashboard */}
          {!isTeacher && (
            <div className="space-y-8">
              {/* Section 1: Status Overview */}
              <section className="animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatusCard 
                    type="xp" 
                    label={t.totalXP} 
                    value={xp} 
                  />
                  <StatusCard 
                    type="streak" 
                    label={t.currentStreak} 
                    value={streak} 
                  />
                </div>
              </section>

              {/* Section 2: Primary Actions */}
              <section className="animate-fade-in delay-100">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <ActionButton variant="primary">
                    {t.startDailyTest}
                  </ActionButton>
                  <ActionButton variant="outline">
                    {t.startPractice}
                  </ActionButton>
                </div>
              </section>

              {/* Section 3: Feature Cards Grid - responsive: 2 cols mobile, 3 cols desktop */}
              <section className="animate-fade-in delay-200 w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 w-full">
                  <FeatureCard
                    type="mcqs"
                    label={t.mcqs}
                    isActive={true}
                    onClick={() => navigate('/mcqs')}
                  />
                  <FeatureCard
                    type="cq-explainer"
                    label={t.cqExplainer}
                    isActive={false}
                    comingSoonLabel={t.comingSoon}
                  />
                  <FeatureCard
                    type="mistake-notebook"
                    label={t.mistakeNotebook}
                    isActive={true}
                  />
                  <FeatureCard
                    type="suggestions"
                    label={t.suggestions}
                    isActive={false}
                    comingSoonLabel={t.comingSoon}
                  />
                  <FeatureCard
                    type="leaderboard"
                    label={t.leaderboard}
                    isActive={true}
                  />
                  <FeatureCard
                    type="profile"
                    label={t.profile}
                    isActive={true}
                  />
                </div>
              </section>

              {/* Section 4: Performance Dashboard */}
              <section className="animate-fade-in delay-300">
                <h2 className="text-xl font-display font-bold text-foreground mb-4">
                  {t.performanceTitle}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PerformanceCard
                    type="mcqs-today"
                    label={t.mcqsSmashedToday}
                    value={mcqsToday}
                  />
                  <PerformanceCard
                    type="rank"
                    label={t.yourRank}
                    value="—"
                  />
                </div>
              </section>

              {/* Notification Toggle Button - Fixed at bottom right */}
              <button
                onClick={() => setShowNotifications(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-emerald hover:scale-105 transition-all duration-300 flex items-center justify-center"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs font-bold flex items-center justify-center">
                  2
                </span>
              </button>

              {/* Notifications Slide-up Panel */}
              <div
                className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
                  showNotifications ? 'translate-y-0' : 'translate-y-full'
                }`}
              >
                <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden">
                  {/* Handle bar */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  </div>
                  
                  {/* Header with close button */}
                  <div className="flex items-center justify-between px-6 pb-4">
                    <h3 className="text-lg font-display font-bold text-foreground">{t.notifications}</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  {/* Notifications content */}
                  <div className="px-6 pb-8 max-h-[50vh] overflow-y-auto">
                    <NotificationsCard
                      title=""
                      notifications={[
                        { id: '1', message: t.dailyTestAvailable, isNew: true },
                        { id: '2', message: t.newPracticeSets, isNew: false },
                      ]}
                      emptyMessage={t.noNotifications}
                    />
                  </div>
                </div>
              </div>

              {/* Backdrop when notifications open */}
              {showNotifications && (
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
                  onClick={() => setShowNotifications(false)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float delay-500" />
      </div>
    </div>
  );
};

export default Dashboard;
