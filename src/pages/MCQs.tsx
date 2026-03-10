import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyTest } from '@/hooks/useDailyTest';
import { useUserStats } from '@/hooks/useUserStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { saveTestResult, savePracticeResult, saveMistakes, saveTestResultAtomic } from '@/lib/firebaseService';
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

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

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [forceSubmit, setForceSubmit] = useState(false);

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
        if (!dailyStatus.canTakeTest) {
          setError('You have already completed today\'s test. Come back tomorrow!');
          setLoading(false);
          return;
        }

        const result = await getOrCreateDailyTest();
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setQuestions(result.questions);
        setDailyTestId(result.dailyTestId);
      } else {
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
      }

      setLoading(false);
    };

    if (!dailyStatus.canTakeTest && mode === 'test' && !loading) {
    } else {
      loadQuestions();
    }
  }, [user, coachingId, mode, dailyStatus.canTakeTest, dailyStatus.canTakePractice]);

  // ANTI-CHEAT
  useEffect(() => {
    if (phase !== 'test') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
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
    setTestStartTime(Date.now());
    setPhase('test');
  };

  const handleTestComplete = async () => {
    const timeTakenSeconds = Math.floor((Date.now() - testStartTime) / 1000);
    const wrongAnswers = answeredQuestions.filter(q => !q.isCorrect);

    try {
      const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
      const wrongCount = answeredQuestions.filter(q => !q.isCorrect).length;
      const totalQuestions = answeredQuestions.length;
      const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

      let calculatedXp = 0;
      if (mode === 'test') {
        calculatedXp = (correctCount * 10) - (wrongCount * 5);
        calculatedXp = Math.max(0, calculatedXp);
      }

      if (mode === 'test' && coachingId) {
        // ATOMIC: saves result + updates leaderboard + streak in coaching server
        const atomicResult = await saveTestResultAtomic(user!.id, coachingId, {
          setId: dailyTestId || `test_${Date.now()}`,
          correct: correctCount,
          wrong: wrongCount,
          score: scorePercentage,
          timeTakenSeconds,
        });
        console.log('✅ FIREBASE ATOMIC: Test saved in coaching server');

        // Save mistakes to coaching server
        if (wrongAnswers.length > 0) {
          const mistakeRecords = wrongAnswers.map(wa => {
            const question = questions[wa.questionIndex];
            return {
              questionId: `q_${wa.questionIndex}`,
              questionText: question?.question || `Question ${wa.questionIndex + 1}`,
              options: question?.options || [],
              selected: question?.options?.[wa.selectedOption] || String(wa.selectedOption),
              correct: question?.options?.[wa.correctAnswer] || String(wa.correctAnswer),
              subject: 'Science',
              source: 'test' as const,
            };
          });
          await saveMistakes(user!.id, coachingId, mistakeRecords);
        }

        await recordTestAttempt(dailyTestId!, 'atomic');
        await updateStats(calculatedXp);
        await updateLeaderboardForTest(correctCount, wrongCount, totalQuestions);
      } else if (coachingId) {
        // Practice mode — save to coaching server without XP/leaderboard
        await savePracticeResult(user!.id, coachingId, {
          setId: `practice_${practiceSetNumber}_${Date.now()}`,
          correct: correctCount,
          wrong: wrongCount,
          score: scorePercentage,
        });

        if (wrongAnswers.length > 0) {
          const mistakeRecords = wrongAnswers.map(wa => {
            const question = questions[wa.questionIndex];
            return {
              questionId: `q_${wa.questionIndex}`,
              questionText: question?.question || `Question ${wa.questionIndex + 1}`,
              options: question?.options || [],
              selected: question?.options?.[wa.selectedOption] || String(wa.selectedOption),
              correct: question?.options?.[wa.correctAnswer] || String(wa.correctAnswer),
              subject: 'Science',
              source: 'practice' as const,
            };
          });
          await saveMistakes(user!.id, coachingId, mistakeRecords);
        }

        await recordPracticeAttempt(practiceSetNumber, `practice_${practiceSetNumber}`);
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

      {tabSwitchCount > 0 && tabSwitchCount < 3 && phase === 'test' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-warning/90 text-warning-foreground text-sm font-medium animate-fade-in">
          ⚠️ Tab switch detected ({tabSwitchCount}/3). {mode === 'test' ? 'Test' : 'Practice'} will auto-submit after 3 switches.
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl animate-float delay-700" />
      </div>
    </div>
  );
};

export default MCQs;