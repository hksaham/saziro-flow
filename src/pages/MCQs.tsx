import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMCQEngine } from '@/hooks/useMCQEngine';
import { useUserStats } from '@/hooks/useUserStats';
import MCQLanding from '@/components/mcq/MCQLanding';
import MCQTest from '@/components/mcq/MCQTest';
import MCQCompletion from '@/components/mcq/MCQCompletion';
import MCQReview from '@/components/mcq/MCQReview';
import { Loader2 } from 'lucide-react';

type MCQPhase = 'landing' | 'test' | 'completion' | 'review';

interface MCQsProps {
  mode?: 'test' | 'practice';
}

// FIXED QUESTION LIMITS
const TEST_QUESTION_LIMIT = 30;
const PRACTICE_QUESTION_LIMIT = 10;

const MCQs = ({ mode = 'test' }: MCQsProps) => {
  const navigate = useNavigate();
  const { user, profile, coachingId } = useAuth();
  const [phase, setPhase] = useState<MCQPhase>('landing');
  const [xpEarned, setXpEarned] = useState(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<{
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
    questionId: string;
    correctAnswer: number;
  }[]>([]);

  // User stats hook for XP and streak updates
  const { updateStats } = useUserStats();

  // Anti-cheat: Track tab visibility
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [forceSubmit, setForceSubmit] = useState(false);

  // Get question limit based on mode
  const questionLimit = mode === 'test' ? TEST_QUESTION_LIMIT : PRACTICE_QUESTION_LIMIT;

  useEffect(() => {
    console.log('🧾 APP AUTH DEBUG (MCQs route):', {
      user: user ? { id: user.id, email: user.email } : null,
      uid: user?.id ?? null,
      role: profile?.role ?? null,
      coachingId: coachingId ?? null,
      mode,
      questionLimit,
    });
  }, [user, profile?.role, coachingId, mode, questionLimit]);
  
  const mcqEngine = useMCQEngine('class_10', 'Science', 'chapter_1', questionLimit);
  
  const {
    questions,
    loading,
    error,
    score,
    totalAnswered,
    meta,
    setId,
    savePerformance,
    resetQuiz
  } = mcqEngine;

  // ANTI-CHEAT: Tab visibility detection
  useEffect(() => {
    if (phase !== 'test') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('⚠️ ANTI-CHEAT: Tab switch detected!');
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            console.log('🚨 ANTI-CHEAT: 3 tab switches - forcing submission');
            setForceSubmit(true);
          }
          return newCount;
        });
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase === 'test') {
        e.preventDefault();
        e.returnValue = 'Your test progress will be lost. Are you sure?';
        return e.returnValue;
      }
    };

    // Prevent back navigation during test
    const handlePopState = (e: PopStateEvent) => {
      if (phase === 'test') {
        window.history.pushState(null, '', window.location.href);
        console.log('⚠️ ANTI-CHEAT: Back navigation blocked');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state for popstate prevention
    window.history.pushState(null, '', window.location.href);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [phase]);

  // Track answered questions for review
  const handleQuestionAnswered = useCallback((
    questionIndex: number, 
    selectedOption: number, 
    isCorrect: boolean,
    questionId?: string,
    correctAnswer?: number
  ) => {
    setAnsweredQuestions(prev => [...prev, { 
      questionIndex, 
      selectedOption, 
      isCorrect,
      questionId: questionId || `q_${questionIndex}`,
      correctAnswer: correctAnswer ?? -1
    }]);
  }, []);

  const handleStartTest = () => {
    console.log(`📝 Starting ${mode} with ${questions.length} questions (limit: ${questionLimit})`);
    setTestStartTime(Date.now());
    setPhase('test');
  };

  const handleTestComplete = async () => {
    // Calculate time taken
    const timeTakenSeconds = Math.floor((Date.now() - testStartTime) / 1000);
    
    // Calculate wrong answers for mistake notebook
    const wrongAnswers = answeredQuestions.filter(q => !q.isCorrect);
    console.log(`📊 Test complete. Score: ${score}/${totalAnswered}. Wrong: ${wrongAnswers.length}. Time: ${timeTakenSeconds}s`);
    
    // Save performance (including mistakes) and get XP earned
    const result = await savePerformance(answeredQuestions, mode, timeTakenSeconds);
    
    if (result.success) {
      setXpEarned(result.xpEarned);
      // Update user stats (XP and streak)
      await updateStats(result.xpEarned);
    } else {
      // Fallback XP calculation if save failed
      setXpEarned(score * 10);
    }
    
    setPhase('completion');
  };

  const handleReviewAnswers = () => {
    setPhase('review');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleRestartTest = () => {
    resetQuiz();
    setAnsweredQuestions([]);
    setTabSwitchCount(0);
    setForceSubmit(false);
    setXpEarned(0);
    setTestStartTime(0);
    setPhase('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground font-medium">Preparing your {mode}...</p>
          <p className="text-sm text-muted-foreground/60 mt-2">Loading questions</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center card-premium p-8 max-w-md mx-4 animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-foreground font-display font-semibold text-lg mb-2">Unable to Load {mode === 'test' ? 'Test' : 'Practice'}</p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button onClick={handleBackToDashboard} className="btn-primary">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-pattern">
      {phase === 'landing' && (
        <MCQLanding
          subject={meta?.subject || 'Science'}
          chapter={`Class ${meta?.class || '10'} - ${meta?.board || 'SSC'} Board`}
          totalQuestions={questions.length}
          totalTime={questions.length * (meta?.timePerQuestion || 50)}
          xpReward={questions.length * 10}
          mode={mode}
          onStart={handleStartTest}
          onChangeChapter={handleBackToDashboard}
        />
      )}
      
      {phase === 'test' && (
        <MCQTest
          mcqEngine={mcqEngine}
          mode={mode}
          tabSwitchCount={tabSwitchCount}
          forceSubmit={forceSubmit}
          onComplete={handleTestComplete}
          onQuestionAnswered={handleQuestionAnswered}
          onExit={handleBackToDashboard}
        />
      )}
      
      {phase === 'completion' && (
        <MCQCompletion
          score={score}
          totalQuestions={questions.length}
          totalAnswered={totalAnswered}
          xpEarned={xpEarned}
          mode={mode}
          onReviewAnswers={handleReviewAnswers}
          onBackToDashboard={handleBackToDashboard}
          onRestartTest={handleRestartTest}
        />
      )}
      
      {phase === 'review' && (
        <MCQReview
          questions={questions}
          answeredQuestions={answeredQuestions}
          onBackToResults={() => setPhase('completion')}
          onBackToDashboard={handleBackToDashboard}
        />
      )}

      {/* Tab Switch Warning */}
      {tabSwitchCount > 0 && tabSwitchCount < 3 && phase === 'test' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-warning/90 text-warning-foreground text-sm font-medium animate-fade-in">
          ⚠️ Tab switch detected ({tabSwitchCount}/3). Test will auto-submit after 3 switches.
        </div>
      )}

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float delay-500" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/4 rounded-full blur-3xl animate-float delay-300" />
      </div>
    </div>
  );
};

export default MCQs;
