import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useMCQEngine } from '@/hooks/useMCQEngine';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

const MCQAttempt = () => {
  const { type } = useParams<{ type: 'daily' | 'practice' }>();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');
  const navigate = useNavigate();
  const testType = (type as 'daily' | 'practice') || 'daily';

  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    timeRemaining,
    isLoading,
    error,
    currentAttempt,
    loadMCQSet,
    submitAnswer,
  } = useMCQEngine(setId, testType);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    loadMCQSet();
  }, []);

  useEffect(() => {
    // Reset selection when question changes
    setSelectedOption(null);
    setShowFeedback(false);
    setLastAnswerCorrect(null);
  }, [currentQuestionIndex]);

  const handleOptionSelect = (optionId: string) => {
    if (isSubmitting || showFeedback) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting || showFeedback) return;
    
    setIsSubmitting(true);
    const isCorrect = selectedOption === currentQuestion?.correctOptionId;
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
    
    // Brief delay to show feedback
    setTimeout(async () => {
      await submitAnswer(selectedOption, false);
      setIsSubmitting(false);
    }, 500);
  };

  // Handle already completed error
  useEffect(() => {
    if (error === 'already_completed' && currentAttempt) {
      navigate(`/mcq/result/${currentAttempt.id}`);
    }
  }, [error, currentAttempt, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error && error !== 'already_completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern p-4">
        <div className="card-premium p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Preparing your question...</p>
        </div>
      </div>
    );
  }

  const timerPercentage = (timeRemaining / 50) * 100;
  const isTimerCritical = timeRemaining <= 10;
  const isTimerWarning = timeRemaining <= 20 && timeRemaining > 10;

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Fixed Header with Timer and Progress */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 py-4 space-y-3">
          {/* Top row: Question counter and Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Question</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
            </div>
            
            {/* Timer */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all",
              isTimerCritical && "bg-destructive/10 text-destructive animate-pulse",
              isTimerWarning && "bg-warning/10 text-warning",
              !isTimerCritical && !isTimerWarning && "bg-secondary text-foreground"
            )}>
              <Clock className="w-4 h-4" />
              <span className="text-lg tabular-nums">
                {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:
                {String(timeRemaining % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress 
              value={(currentQuestionIndex / totalQuestions) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentAttempt?.totalCorrect || 0} correct</span>
              <span>{currentAttempt?.totalWrong || 0} wrong</span>
            </div>
          </div>

          {/* Timer progress bar */}
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                isTimerCritical && "bg-destructive",
                isTimerWarning && "bg-warning",
                !isTimerCritical && !isTimerWarning && "bg-primary"
              )}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-6 animate-fade-in">
          {/* Question Card */}
          <div className="card-premium p-6">
            <p className="text-lg font-medium text-foreground leading-relaxed">
              {currentQuestion.question}
            </p>
            {currentQuestion.subject && (
              <p className="text-xs text-muted-foreground mt-2">
                Subject: {currentQuestion.subject}
                {currentQuestion.chapter && ` • ${currentQuestion.chapter}`}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === option.id;
              const isCorrect = option.id === currentQuestion.correctOptionId;
              const showAsCorrect = showFeedback && isCorrect;
              const showAsWrong = showFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  disabled={showFeedback}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                    "flex items-center gap-4 group",
                    !showFeedback && !isSelected && "border-border hover:border-primary/50 hover:bg-primary/5",
                    !showFeedback && isSelected && "border-primary bg-primary/10",
                    showAsCorrect && "border-success bg-success/10",
                    showAsWrong && "border-destructive bg-destructive/10",
                    showFeedback && !isSelected && !isCorrect && "opacity-50"
                  )}
                >
                  {/* Option letter */}
                  <span className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 transition-colors",
                    !showFeedback && !isSelected && "bg-secondary text-foreground group-hover:bg-primary/20",
                    !showFeedback && isSelected && "bg-primary text-primary-foreground",
                    showAsCorrect && "bg-success text-white",
                    showAsWrong && "bg-destructive text-white"
                  )}>
                    {showAsCorrect ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : showAsWrong ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>

                  {/* Option text */}
                  <span className={cn(
                    "flex-1 font-medium",
                    showAsCorrect && "text-success",
                    showAsWrong && "text-destructive"
                  )}>
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting || showFeedback}
              className={cn(
                "w-full py-4 rounded-xl font-semibold text-lg transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedOption && !showFeedback
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </span>
              ) : showFeedback ? (
                <span className="flex items-center justify-center gap-2">
                  {lastAnswerCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      Correct! +10 XP
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-destructive" />
                      Wrong! -5 XP
                    </>
                  )}
                </span>
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>

          {/* XP Status */}
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-full bg-secondary/50 text-sm">
              Current XP: <span className="font-bold text-primary">{currentAttempt?.netXP || 0}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Critical Timer Warning Overlay */}
      {isTimerCritical && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 border-4 border-destructive/50 animate-pulse rounded-none" />
        </div>
      )}
    </div>
  );
};

export default MCQAttempt;
