import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import { useUserStats } from '@/hooks/useUserStats';
import Logo from '@/components/ui/Logo';
import ToneSelector from '@/components/ui/ToneSelector';
import { LogOut } from 'lucide-react';
import StatusCard from '@/components/student/StatusCard';
import ActionButton from '@/components/student/ActionButton';
import FeatureCard from '@/components/student/FeatureCard';
import PerformanceCard from '@/components/student/PerformanceCard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { t } = useTone();
  const { stats, todayTestPerformance, todayPracticePerformance, loading: statsLoading } = useUserStats();

  const xp = stats?.total_xp ?? 0;
  const streak = stats?.current_streak ?? 0;
  const testMcqsToday = todayTestPerformance.total;
  const practiceMcqsToday = todayPracticePerformance.total;

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <ToneSelector />
            <button onClick={signOut} className="btn-ghost flex items-center gap-2">
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
            <p className="text-muted-foreground mt-2">Start learning</p>
          </div>

          <div className="space-y-8">
            {/* Section 1: Status Overview */}
            <section className="animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatusCard type="xp" label={t.totalXP} value={xp} />
                <StatusCard type="streak" label={t.currentStreak} value={streak} />
              </div>
            </section>

            {/* Section 2: Primary Actions */}
            <section className="animate-fade-in delay-100">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <ActionButton variant="primary" onClick={() => navigate('/mcqs/test')}>
                  {t.startDailyTest}
                </ActionButton>
                <ActionButton variant="outline" onClick={() => navigate('/mcqs/practice')}>
                  {t.startPractice}
                </ActionButton>
              </div>
            </section>

            {/* Section 3: Feature Cards Grid */}
            <section className="animate-fade-in delay-200 w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 w-full">
                <FeatureCard type="mcqs" label={t.mcqs} isActive={true} onClick={() => navigate('/mcqs')} />
                <FeatureCard type="cq-explainer" label={t.cqExplainer} isActive={false} comingSoonLabel={t.comingSoon} />
                <FeatureCard type="mistake-notebook" label={t.mistakeNotebook} isActive={true} onClick={() => navigate('/mistakes')} />
                <FeatureCard type="suggestions" label={t.suggestions} isActive={false} comingSoonLabel={t.comingSoon} />
                <FeatureCard type="leaderboard" label={t.leaderboard} isActive={true} onClick={() => navigate('/leaderboard')} />
                <FeatureCard type="profile" label={t.profile} isActive={true} onClick={() => navigate('/profile')} />
              </div>
            </section>

            {/* Section 4: Performance Dashboard */}
            <section className="animate-fade-in delay-300">
              <h2 className="text-xl font-display font-bold text-foreground mb-4">
                {t.performanceTitle}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <PerformanceCard type="mcqs-today" label="Test MCQs" value={testMcqsToday} />
                <PerformanceCard type="mcqs-today" label="Practice MCQs" value={practiceMcqsToday} />
                <PerformanceCard type="rank" label="Test Accuracy" value={`${todayTestPerformance.accuracy}%`} />
                <PerformanceCard type="rank" label={t.yourRank} value="—" />
              </div>
            </section>
          </div>
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
