import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import { db, doc, getDoc, query, where, getDocs, collection } from '@/lib/firebase';
import { MCQAttempt } from '@/types/mcq';
import Logo from '@/components/ui/Logo';
import { 
  Clock, 
  AlertTriangle, 
  Target, 
  Zap, 
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const MCQIntro = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: 'daily' | 'practice' }>();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');
  const { user, coachingId, profile } = useAuth();
  const { t } = useTone();
  
  const [loading, setLoading] = useState(true);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [existingAttempt, setExistingAttempt] = useState<MCQAttempt | null>(null);
  const [hasActiveAttempt, setHasActiveAttempt] = useState(false);

  const testType = type || 'daily';
  const isDaily = testType === 'daily';

  useEffect(() => {
    const checkAttemptStatus = async () => {
      if (!user?.id || !coachingId) {
        setLoading(false);
        return;
      }

      try {
        // For daily test, check if already attempted today
        if (isDaily) {
          const today = new Date().toISOString().split('T')[0];
          const dailySetId = `daily_${coachingId}_${today}`;
          const attemptId = `${dailySetId}_${user.id}`;
          
          const attemptRef = doc(db, 'attempts', attemptId);
          const attemptSnap = await getDoc(attemptRef);
          
          if (attemptSnap.exists()) {
            const attempt = attemptSnap.data() as MCQAttempt;
            setExistingAttempt(attempt);
            if (attempt.status === 'completed') {
              setAlreadyAttempted(true);
            } else if (attempt.status === 'in_progress') {
              setHasActiveAttempt(true);
            }
          }
        }

        // Check for any in-progress attempts (anti-cheat)
        const inProgressQuery = query(
          collection(db, 'attempts'),
          where('userId', '==', user.id),
          where('status', '==', 'in_progress')
        );
        const inProgressSnap = await getDocs(inProgressQuery);
        
        if (!inProgressSnap.empty && !hasActiveAttempt) {
          setHasActiveAttempt(true);
          setExistingAttempt(inProgressSnap.docs[0].data() as MCQAttempt);
        }
      } catch (err) {
        console.error('Error checking attempt status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAttemptStatus();
  }, [user?.id, coachingId, isDaily]);

  const handleStart = () => {
    if (isDaily) {
      navigate('/mcq/attempt/daily');
    } else {
      navigate(`/mcq/attempt/practice?setId=${setId}`);
    }
  };

  const handleResume = () => {
    if (existingAttempt) {
      navigate(`/mcq/attempt/${existingAttempt.type}?setId=${existingAttempt.setId}`);
    }
  };

  const handleViewResults = () => {
    if (existingAttempt) {
      navigate(`/mcq/result/${existingAttempt.id}`);
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
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <Logo size="sm" />
        </div>
      </header>

      <main className="flex-1 container px-4 py-8 max-w-2xl mx-auto">
        <div className="space-y-8 animate-fade-in">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold text-foreground">
              {isDaily ? t.startDailyTest : t.startPractice}
            </h1>
            <p className="text-muted-foreground">
              {isDaily 
                ? "Today's challenge awaits. Show what you've learned!"
                : "Practice makes perfect. Take your time to learn."}
            </p>
          </div>

          {/* Already Attempted Message */}
          {alreadyAttempted && (
            <div className="card-premium p-6 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <CheckCircle className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Already Completed!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've already completed today's Daily Test. Come back tomorrow for a new challenge!
                  </p>
                  <Button 
                    onClick={handleViewResults}
                    className="mt-4"
                    variant="outline"
                  >
                    View Your Results
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Resume Attempt */}
          {hasActiveAttempt && !alreadyAttempted && (
            <div className="card-premium p-6 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Resume Your Attempt</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have an unfinished test. Continue where you left off.
                  </p>
                  <Button 
                    onClick={handleResume}
                    className="mt-4"
                  >
                    Resume Test
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Rules Card */}
          {!alreadyAttempted && (
            <div className="card-premium p-6 space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Test Rules
              </h2>

              <div className="grid gap-4">
                <RuleItem
                  icon={<Target className="w-5 h-5" />}
                  title="30 Questions"
                  description="Complete all questions to finish the test"
                />
                <RuleItem
                  icon={<Clock className="w-5 h-5" />}
                  title="50 Seconds Per Question"
                  description="Timer starts immediately and never pauses"
                />
                <RuleItem
                  icon={<Zap className="w-5 h-5" />}
                  title="XP System"
                  description="+10 XP for correct, -5 XP for wrong/timeout"
                />
                <RuleItem
                  icon={<AlertTriangle className="w-5 h-5" />}
                  title="Anti-Cheat Active"
                  description="Tab switch or refresh auto-submits current answer"
                />
                <RuleItem
                  icon={<XCircle className="w-5 h-5" />}
                  title={isDaily ? "No Retakes" : "One Attempt Per Set"}
                  description={isDaily 
                    ? "You can only attempt the Daily Test once"
                    : "Each practice set can only be attempted once"}
                />
              </div>
            </div>
          )}

          {/* Start Button */}
          {!alreadyAttempted && !hasActiveAttempt && (
            <div className="flex justify-center pt-4">
              <Button 
                size="lg" 
                onClick={handleStart}
                className="px-12 py-6 text-lg font-semibold gap-3"
              >
                <Play className="w-6 h-6" />
                Start Test
              </Button>
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

const RuleItem = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-medium text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  </div>
);

export default MCQIntro;
