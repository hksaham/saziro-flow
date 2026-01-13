import { useNavigate } from 'react-router-dom';
import { useTone } from '@/contexts/ToneContext';
import { useDailyTest } from '@/hooks/useDailyTest';
import Logo from '@/components/ui/Logo';
import { 
  ArrowLeft, 
  ClipboardCheck, 
  Dumbbell,
  Zap,
  Target,
  Clock,
  ChevronRight,
  Lock
} from 'lucide-react';

const MCQSelection = () => {
  const navigate = useNavigate();
  const { t } = useTone();
  const { status, loading, TEST_QUESTION_LIMIT, PRACTICE_QUESTION_LIMIT, MAX_PRACTICE_SETS_PER_DAY } = useDailyTest();

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <Logo size="sm" />
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
              {t.mcqs}
            </h1>
            <p className="text-muted-foreground">Choose your mode</p>
          </div>

          {/* Test Card */}
          <button
            onClick={() => navigate('/mcqs/test')}
            disabled={!status.canTakeTest}
            className={`w-full text-left transition-all duration-300 ${
              status.canTakeTest 
                ? 'hover:scale-[1.02] active:scale-[0.99]' 
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className={`relative overflow-hidden rounded-2xl border p-6 ${
              status.canTakeTest 
                ? 'border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 hover:border-primary/50' 
                : 'border-border bg-card'
            }`}>
              {/* Glow effect */}
              {status.canTakeTest && (
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              )}
              
              <div className="relative flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  status.canTakeTest 
                    ? 'bg-primary/10' 
                    : 'bg-muted'
                }`}>
                  {status.canTakeTest ? (
                    <ClipboardCheck className="w-7 h-7 text-primary" />
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-display font-bold text-foreground">
                      Daily Test
                    </h2>
                    {status.canTakeTest && (
                      <ChevronRight className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {status.canTakeTest 
                      ? 'Complete your daily test to earn XP and maintain your streak'
                      : 'You have already completed today\'s test. Come back tomorrow!'
                    }
                  </p>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary">
                      <Target className="w-3.5 h-3.5" />
                      <span>{TEST_QUESTION_LIMIT} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 text-warning">
                      <Zap className="w-3.5 h-3.5" />
                      <span>+10 XP / correct</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>50s / question</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Completed badge */}
              {!status.canTakeTest && (
                <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                  ✓ Completed
                </div>
              )}
            </div>
          </button>

          {/* Practice Card */}
          <button
            onClick={() => navigate('/mcqs/practice')}
            disabled={!status.canTakePractice}
            className={`w-full text-left transition-all duration-300 ${
              status.canTakePractice 
                ? 'hover:scale-[1.02] active:scale-[0.99]' 
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className={`relative overflow-hidden rounded-2xl border p-6 ${
              status.canTakePractice 
                ? 'border-border bg-card hover:border-primary/30' 
                : 'border-border bg-card'
            }`}>
              <div className="relative flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  status.canTakePractice 
                    ? 'bg-secondary' 
                    : 'bg-muted'
                }`}>
                  {status.canTakePractice ? (
                    <Dumbbell className="w-7 h-7 text-foreground" />
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-display font-bold text-foreground">
                      Practice
                    </h2>
                    {status.canTakePractice && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {status.canTakePractice 
                      ? 'Practice with questions from your mistake notebook'
                      : 'Daily limit reached. Come back tomorrow!'
                    }
                  </p>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-foreground">
                      <Target className="w-3.5 h-3.5" />
                      <span>{PRACTICE_QUESTION_LIMIT} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <span>{status.remainingPracticeSets}/{MAX_PRACTICE_SETS_PER_DAY} sets left</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Limit reached badge */}
              {!status.canTakePractice && (
                <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                  Limit reached
                </div>
              )}
            </div>
          </button>

          {/* Info text */}
          <p className="text-center text-sm text-muted-foreground/60 mt-6">
            💡 Complete daily tests to maintain your streak
          </p>
        </div>
      </main>

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float delay-500" />
      </div>
    </div>
  );
};

export default MCQSelection;
