import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import { useMCQEngine } from '@/hooks/useMCQEngine';
import Logo from '@/components/ui/Logo';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RotateCcw,
  Home
} from 'lucide-react';

const MCQs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTone();
  
  const {
    questions,
    currentQuestion,
    currentIndex,
    selectedOption,
    answered,
    score,
    totalAnswered,
    loading,
    error,
    isLastQuestion,
    isFirstQuestion,
    progress,
    selectOption,
    submitAnswer,
    nextQuestion,
    resetQuiz,
    savePerformance
  } = useMCQEngine('class_10', 'physics', 'chapter_1');

  const handleSubmit = () => {
    submitAnswer();
  };

  const handleFinish = async () => {
    if (user?.id) {
      await savePerformance(user.id);
    }
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center card-premium p-8 max-w-md">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Error Loading MCQs</p>
          <p className="text-muted-foreground mb-4">{error}</p>
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
        <div className="text-center card-premium p-8 max-w-md">
          <p className="text-foreground font-semibold mb-4">No questions available</p>
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
            <span className="hidden sm:inline">Back</span>
          </button>
          <Logo size="sm" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Score:</span>
            <span className="font-bold text-primary">{score}/{totalAnswered}</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 container px-4 py-6 max-w-3xl mx-auto">
        {/* Question Counter */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${currentQuestion.difficulty === 'easy' ? 'bg-success/20 text-success' : ''}
            ${currentQuestion.difficulty === 'medium' ? 'bg-warning/20 text-warning' : ''}
            ${currentQuestion.difficulty === 'hard' ? 'bg-destructive/20 text-destructive' : ''}
          `}>
            {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
          </span>
        </div>

        {/* Question Card */}
        <div className="card-premium p-6 sm:p-8 mb-6 animate-fade-in">
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-6">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showResult = answered;
              
              let optionClasses = `
                w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                flex items-center gap-3
              `;
              
              if (showResult) {
                if (isCorrect) {
                  optionClasses += ' border-success bg-success/10 text-success';
                } else if (isSelected && !isCorrect) {
                  optionClasses += ' border-destructive bg-destructive/10 text-destructive';
                } else {
                  optionClasses += ' border-border bg-muted/30 text-muted-foreground';
                }
              } else {
                optionClasses += isSelected
                  ? ' border-primary bg-primary/10 text-foreground'
                  : ' border-border hover:border-primary/50 hover:bg-primary/5 text-foreground cursor-pointer';
              }

              return (
                <button
                  key={index}
                  onClick={() => !answered && selectOption(index)}
                  disabled={answered}
                  className={optionClasses}
                >
                  <span className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    ${showResult && isCorrect ? 'bg-success text-success-foreground' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-destructive text-destructive-foreground' : ''}
                    ${!showResult && isSelected ? 'bg-primary text-primary-foreground' : ''}
                    ${!showResult && !isSelected ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showResult && isCorrect && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation (shown after answer) */}
          {answered && (
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
              <p className="text-sm font-medium text-primary mb-1">Explanation:</p>
              <p className="text-muted-foreground">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          {!answered ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="btn-primary flex-1 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <>
              {isLastQuestion ? (
                <button
                  onClick={handleFinish}
                  className="btn-primary flex-1 py-4 flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Finish & Save
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="btn-primary flex-1 py-4 flex items-center justify-center gap-2"
                >
                  Next Question
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Reset Button */}
        {totalAnswered > 0 && (
          <button
            onClick={resetQuiz}
            className="mt-4 w-full py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
        )}
      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float delay-500" />
      </div>
    </div>
  );
};

export default MCQs;
