import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyTest } from '@/hooks/useDailyTest';
import { useUserStats } from '@/hooks/useUserStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { supabase } from '@/integrations/supabase/client';
import MCQLanding from '@/components/mcq/MCQLanding';
import MCQTest from '@/components/mcq/MCQTest';
import MCQCompletion from '@/components/mcq/MCQCompletion';
import MCQReview from '@/components/mcq/MCQReview';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { MCQQuestion } from '@/types/mcq';

type MCQPhase = 'landing' | 'test' | 'completion' | 'review';

interface MCQsProps {
  mode?: 'test' | 'practice';
}

interface AnsweredQuestion {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  questionId: string;
  correctAnswer: number;
}

const MCQs = ({ mode = 'test' }: MCQsProps) => {
  const navigate = useNavigate();
  const { user, profile, coachingId } = useAuth();
  const [phase, setPhase] = useState<MCQPhase>('landing');
  const [xpEarned, setXpEarned] = useState(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyTestId, setDailyTestId] = useState<string | null>(null);
  const [practiceSetNumber, setPracticeSetNumber] = useState<number>(0);

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  // Hooks
  const { updateStats } = useUserStats();
  const { updateLeaderboardForTest } = useLeaderboard();
  const { 
    status: dailyStatus, 
    getOrCreateDailyTest, 
    getPracticeQuestions,
    recordTestAttempt,
    recordPracticeAttempt,
    TEST_QUESTION_LIMIT,
    PRACTICE_QUESTION_LIMIT,
    MAX_PRACTICE_SETS_PER_DAY
  } = useDailyTest();

  // Anti-cheat state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [forceSubmit, setForceSubmit] = useState(false);

  // Load questions based on mode
  useEffect(() => {
    const loadQuestions = async () => {
      if (!user || !coachingId) {
        setLoading(false);
        setError('Not authenticated');
        return;
      }

      setLoading(true);
      setError(null);

      if (mode === 'test') {
        // Check if test already taken today
        if (!dailyStatus.canTakeTest) {
          setError('You have already completed today\'s test. Come back tomorrow!');
          setLoading(false);
          return;
        }

        // Get or create daily test
        const result = await getOrCreateDailyTest();
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setQuestions(result.questions);
        setDailyTestId(result.dailyTestId);
        console.log(`📋 Loaded ${result.questions.length} test questions`);
      } else {
        // Practice mode
        if (!dailyStatus.canTakePractice) {
          setError(`Daily practice limit reached (${MAX_PRACTICE_SETS_PER_DAY}/day). Come back tomorrow!`);
          setLoading(false);
          return;
        }

        const result = await getPracticeQuestions();
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setQuestions(result.questions);
        setPracticeSetNumber(result.setNumber);
        console.log(`📋 Loaded ${result.questions.length} practice questions (set #${result.setNumber})`);
      }

      setLoading(false);
    };

    // Wait for daily status to load first
    if (!dailyStatus.canTakeTest && mode === 'test' && !loading) {
      // Status loaded and can't take test
    } else {
      loadQuestions();
    }
  }, [user, coachingId, mode, dailyStatus.canTakeTest, dailyStatus.canTakePractice]);

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

    const handlePopState = () => {
      if (phase === 'test') {
        window.history.pushState(null, '', window.location.href);
        console.log('⚠️ ANTI-CHEAT: Back navigation blocked');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [phase]);

  // Quiz control functions
  const selectOption = useCallback((optionIndex: number) => {
    if (answered) return;
    setSelectedOption(optionIndex);
  }, [answered]);

  const submitAnswer = useCallback(() => {
    if (selectedOption === null || answered) return false;
    
    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    
    setAnswered(true);
    if (isCorrect) setScore(prev => prev + 1);
    setTotalAnswered(prev => prev + 1);
    
    return isCorrect;
  }, [selectedOption, answered, questions, currentIndex]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  }, [currentIndex, questions.length]);

  const prevQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  }, [currentIndex]);

  const forceSubmitUnanswered = useCallback(() => {
    console.log('🚨 FORCE SUBMIT: Marking all remaining questions as wrong');
    setTotalAnswered(questions.length);
    setAnswered(true);
  }, [questions.length]);

  const resetQuiz = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setTotalAnswered(0);
    setAnsweredQuestions([]);
    setTabSwitchCount(0);
    setForceSubmit(false);
    setXpEarned(0);
    setTestStartTime(0);
  }, []);

  // Track answered questions for review
  const handleQuestionAnswered = useCallback((
    questionIndex: number, 
    selectedOptionIdx: number, 
    isCorrect: boolean,
    questionId?: string,
    correctAnswer?: number
  ) => {
    setAnsweredQuestions(prev => [...prev, { 
      questionIndex, 
      selectedOption: selectedOptionIdx, 
      isCorrect,
      questionId: questionId || `q_${questionIndex}`,
      correctAnswer: correctAnswer ?? -1
    }]);
  }, []);

  const handleStartTest = () => {
    console.log(`📝 Starting ${mode} with ${questions.length} questions`);
    setTestStartTime(Date.now());
    setPhase('test');
  };

  const handleTestComplete = async () => {
    const timeTakenSeconds = Math.floor((Date.now() - testStartTime) / 1000);
    const wrongAnswers = answeredQuestions.filter(q => !q.isCorrect);
    
    console.log(`📊 ${mode} complete. Score: ${score}/${totalAnswered}. Wrong: ${wrongAnswers.length}. Time: ${timeTakenSeconds}s`);

    try {
      const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
      const wrongCount = answeredQuestions.filter(q => !q.isCorrect).length;
      const totalQuestions = answeredQuestions.length;
      const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

      // Debug log: after test submit
      if (mode === 'test' && user?.id && coachingId) {
        console.log("LEADERBOARD WRITE ATTEMPT", {
          uid: user.id,
          coachingId,
          path: `leaderboards/${coachingId}/users/${user.id}`,
        });
      }
      
      // XP calculation: TEST = +10 correct, -5 wrong | PRACTICE = 0
      let calculatedXp = 0;
      if (mode === 'test') {
        calculatedXp = (correctCount * 10) - (wrongCount * 5);
        calculatedXp = Math.max(0, calculatedXp); // Never negative
      }

      // Save performance record
      const { data: perfData, error: perfError } = await supabase
        .from('mcq_performance')
        .insert({
          user_id: user!.id,
          coaching_id: coachingId,
          mode,
          total_questions: totalQuestions,
          correct_answers: correctCount,
          wrong_answers: wrongCount,
          score_percentage: scorePercentage,
          time_taken_seconds: timeTakenSeconds,
          xp_earned: calculatedXp
        })
        .select()
        .single();

      if (perfError) {
        console.error('Error saving performance:', perfError);
      } else {
        // Save wrong answers to mistake notebook with mode
        if (wrongAnswers.length > 0) {
          const wrongRecords = wrongAnswers.map(wa => {
            const question = questions[wa.questionIndex];
            return {
              user_id: user!.id,
              performance_id: perfData.id,
              question_text: question?.question || `Question ${wa.questionIndex + 1}`,
              options: question?.options || [],
              selected_answer: question?.options?.[wa.selectedOption] || String(wa.selectedOption),
              correct_answer: question?.options?.[wa.correctAnswer] || String(wa.correctAnswer),
              subject: 'Science',
              mode: mode // Track test vs practice mistakes separately
            };
          });

          await supabase.from('mcq_wrong_answers').insert(wrongRecords);
        }

        // Record attempt and update stats based on mode
        if (mode === 'test' && dailyTestId) {
          await recordTestAttempt(dailyTestId, perfData.id);
          // Update XP and streak ONLY for test
          await updateStats(calculatedXp);
          
          // ✅ UPDATE FIREBASE LEADERBOARD (TEST ONLY)
          console.log("📊 Updating Firebase leaderboard after test...");
          const leaderboardSuccess = await updateLeaderboardForTest(
            correctCount,
            wrongCount,
            totalQuestions
          );
          console.log("LEADERBOARD WRITE RESULT", {
            uid: user?.id,
            coachingId,
            success: leaderboardSuccess,
          });
        } else if (mode === 'practice' && practiceSetNumber > 0) {
          await recordPracticeAttempt(practiceSetNumber, perfData.id);
          // Practice: NO XP, NO streak update, NO leaderboard update
        }
      }

      setXpEarned(calculatedXp);
    } catch (err) {
      console.error('Error completing test:', err);
      setXpEarned(0);
    }
    
    setPhase('completion');
  };

  const handleReviewAnswers = () => setPhase('review');
  const handleBackToDashboard = () => navigate('/dashboard');
  
  const handleRestartTest = () => {
    resetQuiz();
    setPhase('landing');
  };

  // Build MCQ engine-like object for MCQTest component
  const mcqEngine = {
    questions,
    currentIndex,
    selectedOption,
    answered,
    score,
    totalAnswered,
    loading,
    error,
    currentQuestion: questions[currentIndex] || null,
    isLastQuestion: currentIndex === questions.length - 1,
    isFirstQuestion: currentIndex === 0,
    progress: questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0,
    meta: { subject: 'Science', class: '10', board: 'SSC', timePerQuestion: 50 },
    setId: null,
    selectOption,
    submitAnswer,
    forceSubmitUnanswered,
    nextQuestion,
    prevQuestion,
    resetQuiz,
    savePerformance: async () => ({ success: true, xpEarned: 0 }),
    refetch: () => {}
  };

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center card-premium p-8 max-w-md mx-4 animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-foreground font-display font-semibold text-lg mb-2">
            {mode === 'test' ? 'Test Unavailable' : 'Practice Unavailable'}
          </p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button onClick={handleBackToDashboard} className="btn-primary">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get question limit based on mode
  const questionLimit = mode === 'test' ? TEST_QUESTION_LIMIT : PRACTICE_QUESTION_LIMIT;
  const maxXp = mode === 'test' ? questionLimit * 10 : 0;

  return (
    <div className="min-h-screen bg-background bg-pattern">
      {phase === 'landing' && (
        <MCQLanding
          subject="Science"
          chapter={`Class 10 - SSC Board`}
          totalQuestions={questions.length}
          totalTime={questions.length * 50}
          xpReward={maxXp}
          mode={mode}
          practiceSetInfo={mode === 'practice' ? {
            setNumber: practiceSetNumber,
            remaining: dailyStatus.remainingPracticeSets
          } : undefined}
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
          ⚠️ Tab switch detected ({tabSwitchCount}/3). {mode === 'test' ? 'Test' : 'Practice'} will auto-submit after 3 switches.
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
