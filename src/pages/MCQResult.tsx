import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc } from '@/lib/firebase';
import { MCQAttempt } from '@/types/mcq';
import { useTone } from '@/contexts/ToneContext';
import Logo from '@/components/ui/Logo';
import { 
  Trophy, 
  Target, 
  Zap, 
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Home,
  RotateCcw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';

const MCQResult = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { t } = useTone();
  
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<MCQAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttempt = async () => {
      if (!attemptId) {
        setError('Invalid attempt ID');
        setLoading(false);
        return;
      }

      try {
        const attemptRef = doc(db, 'attempts', attemptId);
        const attemptSnap = await getDoc(attemptRef);

        if (!attemptSnap.exists()) {
          setError('Attempt not found');
          setLoading(false);
          return;
        }

        const attemptData = attemptSnap.data() as MCQAttempt;
        setAttempt(attemptData);
        
        // Celebrate if good score
        if (attemptData.totalCorrect >= 20) {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }, 500);
        }
      } catch (err) {
        console.error('Error fetching attempt:', err);
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern p-4">
        <div className="card-premium p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Error</h2>
          <p className="text-muted-foreground">{error || 'Something went wrong'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const totalQuestions = attempt.totalCorrect + attempt.totalWrong;
  const accuracy = totalQuestions > 0 ? Math.round((attempt.totalCorrect / totalQuestions) * 100) : 0;
  const isPassing = accuracy >= 60;
  const isExcellent = accuracy >= 80;

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="container flex justify-center items-center h-16 px-6">
          <Logo size="sm" />
        </div>
      </header>

      <main className="flex-1 container px-4 py-8 max-w-2xl mx-auto">
        <div className="space-y-8 animate-fade-in">
          {/* Result Header */}
          <div className="text-center space-y-4">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
              isExcellent ? 'bg-success/10' : isPassing ? 'bg-primary/10' : 'bg-warning/10'
            }`}>
              <Trophy className={`w-12 h-12 ${
                isExcellent ? 'text-success' : isPassing ? 'text-primary' : 'text-warning'
              }`} />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {isExcellent ? 'Excellent!' : isPassing ? 'Well Done!' : 'Keep Practicing!'}
            </h1>
            <p className="text-muted-foreground">
              {attempt.type === 'daily' ? 'Daily Test' : 'Practice Test'} Completed
            </p>
          </div>

          {/* Score Card */}
          <div className="card-premium p-6 space-y-6">
            {/* Accuracy Circle */}
            <div className="flex justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-secondary"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * accuracy) / 100}
                    className={
                      isExcellent ? 'text-success' : isPassing ? 'text-primary' : 'text-warning'
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-foreground">{accuracy}%</span>
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<CheckCircle2 className="w-5 h-5 text-success" />}
                label="Correct"
                value={attempt.totalCorrect}
                color="success"
              />
              <StatCard
                icon={<XCircle className="w-5 h-5 text-destructive" />}
                label="Wrong"
                value={attempt.totalWrong}
                color="destructive"
              />
            </div>

            {/* XP Summary */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                XP Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    XP Gained
                  </span>
                  <span className="text-success font-medium">+{attempt.xpGained}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    XP Lost
                  </span>
                  <span className="text-destructive font-medium">-{attempt.xpLost}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Net XP</span>
                  <span className={`text-xl font-bold ${
                    attempt.netXP >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {attempt.netXP >= 0 ? '+' : ''}{attempt.netXP}
                  </span>
                </div>
              </div>
            </div>

            {/* Question Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Question Breakdown
              </h3>
              <div className="flex gap-1 flex-wrap">
                {attempt.answers.map((answer, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                      answer.isCorrect
                        ? 'bg-success/20 text-success'
                        : answer.isTimeout
                        ? 'bg-warning/20 text-warning'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                    title={
                      answer.isCorrect
                        ? 'Correct'
                        : answer.isTimeout
                        ? 'Timeout'
                        : 'Wrong'
                    }
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success/20" /> Correct
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive/20" /> Wrong
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-warning/20" /> Timeout
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
            {attempt.type === 'practice' && (
              <Button
                onClick={() => navigate('/mcq/intro/practice')}
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Another Set
              </Button>
            )}
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

const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'success' | 'destructive';
}) => (
  <div className={`p-4 rounded-xl border ${
    color === 'success' ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
  }`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${
        color === 'success' ? 'bg-success/10' : 'bg-destructive/10'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </div>
);

export default MCQResult;
