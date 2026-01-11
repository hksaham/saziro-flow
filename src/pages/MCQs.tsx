import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMCQEngine } from '@/hooks/useMCQEngine';
import MCQLanding from '@/components/mcq/MCQLanding';
import MCQTest from '@/components/mcq/MCQTest';
import MCQCompletion from '@/components/mcq/MCQCompletion';
import MCQReview from '@/components/mcq/MCQReview';
import { Loader2 } from 'lucide-react';

type MCQPhase = 'landing' | 'test' | 'completion' | 'review';

const MCQs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<MCQPhase>('landing');
  const [answeredQuestions, setAnsweredQuestions] = useState<{
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
  }[]>([]);
  
  const mcqEngine = useMCQEngine('class_10', 'physics', 'chapter_1');
  
  const {
    questions,
    loading,
    error,
    score,
    totalAnswered,
    savePerformance,
    resetQuiz
  } = mcqEngine;

  // Track answered questions for review
  const handleQuestionAnswered = useCallback((questionIndex: number, selectedOption: number, isCorrect: boolean) => {
    setAnsweredQuestions(prev => [...prev, { questionIndex, selectedOption, isCorrect }]);
  }, []);

  const handleStartTest = () => {
    setPhase('test');
  };

  const handleTestComplete = async () => {
    if (user?.id) {
      await savePerformance(user.id);
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
          <p className="text-muted-foreground font-medium">Preparing your test...</p>
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
          <p className="text-foreground font-display font-semibold text-lg mb-2">Unable to Load Test</p>
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
          subject="Physics"
          chapter="Chapter 1: Laws of Motion"
          totalQuestions={questions.length}
          totalTime={questions.length * 50}
          xpReward={questions.length * 10}
          onStart={handleStartTest}
          onChangeChapter={handleBackToDashboard}
        />
      )}
      
      {phase === 'test' && (
        <MCQTest
          mcqEngine={mcqEngine}
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
          xpEarned={score * 10}
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
