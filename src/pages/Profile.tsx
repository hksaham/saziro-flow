import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone, ToneType } from '@/contexts/ToneContext';
import { useUserStats } from '@/hooks/useUserStats';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Star, 
  Flame, 
  Target, 
  TrendingUp,
  TrendingDown,
  Zap,
  Settings,
  Sun,
  Moon,
  Languages,
  Edit3,
  KeyRound,
  LogOut,
  Shield,
  Save,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PerformanceMetrics {
  totalMcqsAttempted: number;
  overallAccuracy: number;
  strongestSubject: string | null;
  weakestSubject: string | null;
}

interface DailyUsage {
  testUsed: number;
  testLimit: number;
  practiceUsed: number;
  practiceLimit: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { tone, setTone, t } = useTone();
  const { stats, todayTestPerformance, todayPracticePerformance, loading: statsLoading } = useUserStats();
  
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalMcqsAttempted: 0,
    overallAccuracy: 0,
    strongestSubject: null,
    weakestSubject: null
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({
    testUsed: 0,
    testLimit: 1,
    practiceUsed: 0,
    practiceLimit: 3
  });
  const [loading, setLoading] = useState(true);

  // Fetch performance metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        // Fetch all MCQ performance
        const { data: perfData, error: perfError } = await supabase
          .from('mcq_performance')
          .select('correct_answers, total_questions, mode')
          .eq('user_id', user.id);

        if (perfError) throw perfError;

        if (perfData && perfData.length > 0) {
          const totalCorrect = perfData.reduce((sum, p) => sum + p.correct_answers, 0);
          const totalQuestions = perfData.reduce((sum, p) => sum + p.total_questions, 0);
          
          setPerformanceMetrics({
            totalMcqsAttempted: totalQuestions,
            overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
            strongestSubject: 'Physics', // Placeholder - would need subject tracking
            weakestSubject: 'Chemistry'  // Placeholder - would need subject tracking
          });
        }

        // Fetch today's usage
        const today = new Date().toISOString().split('T')[0];
        
        // Test attempts today
        const { data: testAttempts } = await supabase
          .from('daily_test_attempts')
          .select('id')
          .eq('user_id', user.id)
          .gte('completed_at', `${today}T00:00:00`)
          .lte('completed_at', `${today}T23:59:59`);

        // Practice attempts today
        const { data: practiceAttempts } = await supabase
          .from('practice_attempts')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);

        setDailyUsage({
          testUsed: testAttempts?.length || 0,
          testLimit: 1,
          practiceUsed: practiceAttempts?.length || 0,
          practiceLimit: 3
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  // Update edited name when profile loads
  useEffect(() => {
    if (profile?.full_name) {
      setEditedName(profile.full_name);
    }
  }, [profile]);

  const handleSaveName = async () => {
    if (!user || !editedName.trim()) return;
    
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editedName.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditingName(false);
      toast.success('Name updated successfully!');
    } catch (err) {
      console.error('Error updating name:', err);
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error('Error sending reset email:', err);
      toast.error('Failed to send reset email');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toneOptions: { value: ToneType; label: string; emoji: string }[] = [
    { value: 'chill-bro-banglish', label: 'Chill Bro', emoji: '😎' },
    { value: 'friendly-banglish', label: 'Friendly Banglish', emoji: '🙂' },
    { value: 'formal-bangla', label: 'Formal Bangla', emoji: '📚' },
  ];

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const xp = stats?.total_xp ?? 0;
  const streak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-display font-bold text-foreground">{t.profile}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Section 1: User Identity Card */}
        <section className="card-premium p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-primary" />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-9 text-lg font-semibold bg-secondary"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(profile?.full_name || '');
                    }}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-display font-bold text-foreground truncate">
                    {profile?.full_name || 'Student'}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mb-3">
                @{user?.email?.split('@')[0] || 'username'}
              </p>
              
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  Class 10
                </span>
                <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  Dhaka Board
                </span>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(user?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Academic Snapshot */}
        <section className="space-y-4 animate-fade-in delay-100">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Academic Snapshot
          </h3>
          
          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Star className="w-4 h-4 text-warning" />
                </div>
                <span className="text-xs text-muted-foreground">Total XP</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground xp-glow">
                {xp.toLocaleString()}
              </p>
            </div>
            
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Flame className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-xs text-muted-foreground">Current Streak</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">
                {streak} <span className="text-sm text-muted-foreground font-normal">days</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Best: {longestStreak} days
              </p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">MCQs Attempted</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {performanceMetrics.totalMcqsAttempted}
              </p>
            </div>
            
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Accuracy</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {performanceMetrics.overallAccuracy}%
              </p>
            </div>
          </div>

          {/* Subject Performance */}
          <div className="card-premium p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Strongest Subject</p>
                  <p className="text-sm font-semibold text-foreground">
                    {performanceMetrics.strongestSubject || 'Not enough data'}
                  </p>
                </div>
              </div>
              
              <div className="w-px h-10 bg-border" />
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Needs Work</p>
                  <p className="text-sm font-semibold text-foreground">
                    {performanceMetrics.weakestSubject || 'Not enough data'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Daily Limits & Plan */}
        <section className="space-y-4 animate-fade-in delay-200">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Daily Limits & Plan
          </h3>
          
          <div className="card-premium p-4 space-y-4">
            {/* Test Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">MCQ Test</span>
                <span className="text-sm font-semibold text-foreground">
                  {dailyUsage.testUsed}/{dailyUsage.testLimit}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(dailyUsage.testUsed / dailyUsage.testLimit) * 100}%` }}
                />
              </div>
            </div>

            {/* Practice Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">MCQ Practice</span>
                <span className="text-sm font-semibold text-foreground">
                  {dailyUsage.practiceUsed}/{dailyUsage.practiceLimit}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent-foreground rounded-full transition-all duration-500"
                  style={{ width: `${(dailyUsage.practiceUsed / dailyUsage.practiceLimit) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Plan */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Current Plan</p>
                  <p className="text-xs text-muted-foreground">Free tier</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-secondary text-sm font-medium text-muted-foreground">
                  Free
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Settings & Controls */}
        <section className="space-y-4 animate-fade-in delay-300">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings & Controls
          </h3>
          
          <div className="card-premium divide-y divide-border">
            {/* Theme Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkTheme ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-warning" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    {isDarkTheme ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isDarkTheme ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    isDarkTheme ? 'left-6' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Language Tone */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Languages className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Language Tone</p>
                  <p className="text-xs text-muted-foreground">Choose your vibe</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {toneOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      tone === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg mb-1 block">{option.emoji}</span>
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Password */}
            <button
              onClick={handleResetPassword}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
            >
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Reset Password</p>
                <p className="text-xs text-muted-foreground">Send reset link to email</p>
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full p-4 flex items-center gap-3 hover:bg-destructive/10 transition-colors group"
            >
              <LogOut className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">Logout</p>
            </button>
          </div>
        </section>

        {/* Section 5: Integrity Notice */}
        <section className="animate-fade-in delay-400">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Anti-cheat system is active.</span>{' '}
                  Suspicious activity may result in streak resets and XP deductions. 
                  Play fair, study smart.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;
