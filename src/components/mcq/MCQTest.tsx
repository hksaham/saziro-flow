import { useState, useEffect, useCallback } from 'react';
import Logo from '@/components/ui/Logo';
import { 
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  X,
  AlertCircle
} from 'lucide-react';

interface MCQTestProps {
  mcqEngine: {
    questions: any[];
    currentQuestion: any;
    currentIndex: number;
    selectedOption: number | null;
    answered: boolean;
    score: number;
    totalAnswered: number;
    isLastQuestion: boolean;
    progress: number;
    selectOption: (index: number) => void;
    submitAnswer: () => boolean | undefined;
    nextQuestion: () => void;
  };
  onComplete: () => void;
  onQuestionAnswered: (questionIndex: number, selectedOption: number, isCorrect: boolean) => void;
  onExit: () => void;
}

const MCQTest = ({ mcqEngine, onComplete, onQuestionAnswered, onExit }: MCQTestProps) => {
  const [timer, setTimer] = useState(50);
  const [isTimerWarning, setIsTimerWarning] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    questions,
    currentQuestion,
    currentIndex,
    selectedOption,
    answered,
    score,
    totalAnswered,
    isLastQuestion,
    progress,
    selectOption,
    submitAnswer,
    nextQuestion
  } = mcqEngine;

  // Timer logic
  useEffect(() => {
    if (answered) return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          if (selectedOption !== null) {
            handleSubmit();
          }
          return 0;
        }
        if (prev <= 10) {
          setIsTimerWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [answered, selectedOption]);

  // Reset timer on new question
  useEffect(() => {
    setTimer(50);
    setIsTimerWarning(false);
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    if (selectedOption === null) return;
    const isCorrect = submitAnswer();
    onQuestionAnswered(currentIndex, selectedOption, isCorrect ?? false);
  }, [selectedOption, submitAnswer, currentIndex, onQuestionAnswered]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      onComplete();
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        nextQuestion();
        setIsTransitioning(false);
      }, 300);
    }
  }, [isLastQuestion, nextQuestion, onComplete]);

  const handleOptionSelect = (index: number) => {
    if (answered) return;
    selectOption(index);
  };

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-4 sm:px-6">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              <span className="text-foreground font-bold">{currentIndex + 1}</span>
              <span className="mx-1">/</span>
              <span>{questions.length}</span>
            </span>
          </div>

          <Logo size="sm" />

          {/* Timer */}
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300
            ${isTimerWarning 
              ? 'bg-destructive/10 border border-destructive/30 text-destructive animate-pulse' 
              : 'bg-secondary/50 border border-border/50 text-foreground'
            }
          `}>
            <Clock className={`w-4 h-4 ${isTimerWarning ? 'text-destructive' : 'text-primary'}`} />
            <span className="font-mono font-bold text-sm w-6 text-center">{timer}</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-muted/50">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 container px-4 py-6 max-w-2xl mx-auto">
        <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
          {/* Difficulty Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`
              px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
              ${currentQuestion.difficulty === 'easy' ? 'bg-success/10 text-success border border-success/20' : ''}
              ${currentQuestion.difficulty === 'medium' ? 'bg-warning/10 text-warning border border-warning/20' : ''}
              ${currentQuestion.difficulty === 'hard' ? 'bg-destructive/10 text-destructive border border-destructive/20' : ''}
            `}>
              {currentQuestion.difficulty}
            </span>
            <span className="text-sm text-muted-foreground">
              Score: <span className="text-primary font-bold">{score}</span>
            </span>
          </div>

          {/* Question Card */}
          <div 
            className="relative overflow-hidden rounded-2xl border border-border/50 mb-6 animate-scale-in"
            style={{
              background: 'linear-gradient(135deg, hsl(0, 0%, 7%) 0%, hsl(0, 0%, 5%) 100%)',
              boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground leading-relaxed">
                {currentQuestion.question}
              </h2>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option: string, index: number) => {
              const isSelected = selectedOption === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showResult = answered;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  disabled={answered}
                  className={`
                    w-full p-4 sm:p-5 rounded-xl border-2 text-left transition-all duration-300
                    flex items-center gap-4 group relative overflow-hidden
                    ${showResult && isCorrect 
                      ? 'border-success bg-success/10 shadow-lg shadow-success/10' 
                      : showResult && isSelected && !isCorrect 
                        ? 'border-destructive bg-destructive/10 shadow-lg shadow-destructive/10' 
                        : showResult 
                          ? 'border-border/50 bg-muted/20 opacity-60' 
                          : isSelected 
                            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02]' 
                            : 'border-border/50 bg-card/50 hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.01] cursor-pointer'
                    }
                  `}
                  style={{
                    transform: showResult ? 'none' : undefined
                  }}
                >
                  {/* Hover Glow */}
                  {!answered && !isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}

                  {/* Letter Badge */}
                  <span className={`
                    relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                    transition-all duration-300
                    ${showResult && isCorrect 
                      ? 'bg-success text-success-foreground' 
                      : showResult && isSelected && !isCorrect 
                        ? 'bg-destructive text-destructive-foreground' 
                        : isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                    }
                  `}>
                    {String.fromCharCode(65 + index)}
                  </span>

                  {/* Option Text */}
                  <span className={`
                    relative z-10 flex-1 font-medium transition-colors
                    ${showResult && isCorrect ? 'text-success' : ''}
                    ${showResult && isSelected && !isCorrect ? 'text-destructive' : ''}
                    ${!showResult ? 'text-foreground' : ''}
                  `}>
                    {option}
                  </span>

                  {/* Result Icon */}
                  {showResult && isCorrect && (
                    <CheckCircle className="w-6 h-6 text-success animate-scale-in" />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <XCircle className="w-6 h-6 text-destructive animate-scale-in" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 mb-6 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Explanation</p>
                  <p className="text-muted-foreground leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!answered ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className={`
                w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300
                ${selectedOption === null 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'btn-primary'
                }
              `}
            >
              Confirm Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg btn-primary flex items-center justify-center gap-2 group"
            >
              {isLastQuestion ? 'Complete Test' : 'Next Question'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </main>

      {/* Exit Button */}
      <button
        onClick={() => setShowExitConfirm(true)}
        className="fixed top-20 right-4 p-2 rounded-full bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground hover:border-destructive/50 transition-all z-40"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-card border border-border shadow-2xl animate-scale-in">
            <h3 className="text-lg font-display font-bold text-foreground mb-2">Exit Test?</h3>
            <p className="text-muted-foreground mb-6">Your progress will be lost. Are you sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-medium border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Continue Test
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCQTest;
