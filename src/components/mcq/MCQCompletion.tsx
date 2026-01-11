import { useState, useEffect } from 'react';
import Logo from '@/components/ui/Logo';
import { 
  Trophy,
  Target,
  Percent,
  Zap,
  ArrowRight,
  Home,
  RotateCcw,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface MCQCompletionProps {
  score: number;
  totalQuestions: number;
  totalAnswered: number;
  xpEarned: number;
  onReviewAnswers: () => void;
  onBackToDashboard: () => void;
  onRestartTest: () => void;
}

const MCQCompletion = ({
  score,
  totalQuestions,
  totalAnswered,
  xpEarned,
  onReviewAnswers,
  onBackToDashboard,
  onRestartTest
}: MCQCompletionProps) => {
  const [displayedXP, setDisplayedXP] = useState(0);
  const [showContent, setShowContent] = useState(false);
  
  const accuracy = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;
  const wrong = totalAnswered - score;
  
  // Performance insight based on accuracy
  const getPerformanceInsight = () => {
    if (accuracy >= 80) return { text: "Excellent! You've mastered this topic", icon: '🏆', color: 'text-success' };
    if (accuracy >= 60) return { text: "Good progress! Keep practicing", icon: '💪', color: 'text-primary' };
    if (accuracy >= 40) return { text: "Room for improvement. Review the concepts", icon: '📚', color: 'text-warning' };
    return { text: "Don't give up! Practice makes perfect", icon: '🎯', color: 'text-muted-foreground' };
  };

  const insight = getPerformanceInsight();

  // Animate XP counter
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showContent) return;
    
    const duration = 1500;
    const steps = 60;
    const increment = xpEarned / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= xpEarned) {
        setDisplayedXP(xpEarned);
        clearInterval(interval);
      } else {
        setDisplayedXP(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [xpEarned, showContent]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex justify-center items-center h-16 px-6">
          <Logo size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className={`w-full max-w-lg transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Celebration Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-scale-in">
                <Trophy className="w-12 h-12 text-primary" />
              </div>
              {/* Sparkle effects */}
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-warning animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-primary animate-pulse delay-200" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
              Test Complete!
            </h1>
            <p className="text-muted-foreground">Here's how you performed</p>
          </div>

          {/* Stats Card */}
          <div 
            className="relative overflow-hidden rounded-2xl border border-border/50 mb-6"
            style={{
              background: 'linear-gradient(135deg, hsl(0, 0%, 7%) 0%, hsl(0, 0%, 5%) 100%)',
              boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            {/* XP Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 rounded-full blur-3xl" />
            
            <div className="relative p-6 sm:p-8">
              {/* XP Earned - Hero Section */}
              <div className="text-center mb-8 pb-6 border-b border-border/50">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <Zap className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium uppercase tracking-wide">XP Earned</span>
                </div>
                <p className="text-5xl sm:text-6xl font-display font-bold text-gradient-emerald">
                  +{displayedXP}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-success/5 border border-success/20">
                  <Target className="w-5 h-5 text-success mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-success">{score}</p>
                  <p className="text-xs text-muted-foreground mt-1">Correct</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <Target className="w-5 h-5 text-destructive mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-destructive">{wrong}</p>
                  <p className="text-xs text-muted-foreground mt-1">Wrong</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <Percent className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-primary">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insight */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 mb-6 animate-fade-in delay-200">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
              {insight.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${insight.color}`} />
                <span className="text-sm font-medium text-muted-foreground">Performance Insight</span>
              </div>
              <p className={`font-medium ${insight.color}`}>{insight.text}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 animate-fade-in delay-300">
            <button
              onClick={onReviewAnswers}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg btn-primary flex items-center justify-center gap-2 group"
            >
              Review Answers
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onRestartTest}
                className="py-3 px-4 rounded-xl font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={onBackToDashboard}
                className="py-3 px-4 rounded-xl font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MCQCompletion;
