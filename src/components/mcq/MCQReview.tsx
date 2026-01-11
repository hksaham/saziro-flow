import { useState } from 'react';
import Logo from '@/components/ui/Logo';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Home,
  AlertCircle
} from 'lucide-react';

interface AnsweredQuestion {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
}

interface MCQReviewProps {
  questions: any[];
  answeredQuestions: AnsweredQuestion[];
  onBackToResults: () => void;
  onBackToDashboard: () => void;
}

const MCQReview = ({
  questions,
  answeredQuestions,
  onBackToResults,
  onBackToDashboard
}: MCQReviewProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  const getAnswerForQuestion = (questionIndex: number) => {
    return answeredQuestions.find(a => a.questionIndex === questionIndex);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-4 sm:px-6">
          <button
            onClick={onBackToResults}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline font-medium">Results</span>
          </button>
          <Logo size="sm" />
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-4 py-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Review Answers</h1>
          <p className="text-muted-foreground">
            Tap on any question to see the explanation
          </p>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question, index) => {
            const answer = getAnswerForQuestion(index);
            const isCorrect = answer?.isCorrect ?? false;
            const isExpanded = expandedIndex === index;
            const wasAnswered = answer !== undefined;

            return (
              <div
                key={index}
                className={`
                  rounded-2xl border overflow-hidden transition-all duration-300 animate-fade-in
                  ${isCorrect 
                    ? 'border-success/30 bg-success/5' 
                    : 'border-destructive/30 bg-destructive/5'
                  }
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Question Header */}
                <button
                  onClick={() => toggleExpanded(index)}
                  className="w-full p-4 sm:p-5 flex items-start gap-4 text-left hover:bg-white/5 transition-colors"
                >
                  {/* Status Icon */}
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${isCorrect ? 'bg-success/20' : 'bg-destructive/20'}
                  `}>
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>

                  {/* Question Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Q{index + 1}</span>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full
                        ${question.difficulty === 'easy' ? 'bg-success/10 text-success' : ''}
                        ${question.difficulty === 'medium' ? 'bg-warning/10 text-warning' : ''}
                        ${question.difficulty === 'hard' ? 'bg-destructive/10 text-destructive' : ''}
                      `}>
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="text-foreground font-medium leading-snug line-clamp-2">
                      {question.question}
                    </p>
                  </div>

                  {/* Expand Icon */}
                  <div className="flex-shrink-0 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <div className={`
                  overflow-hidden transition-all duration-300
                  ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-border/20">
                    {/* Options */}
                    <div className="space-y-2 mb-4">
                      {question.options.map((option: string, optIndex: number) => {
                        const isThisCorrect = optIndex === question.correctIndex;
                        const wasSelected = answer?.selectedOption === optIndex;

                        return (
                          <div
                            key={optIndex}
                            className={`
                              p-3 rounded-xl border flex items-center gap-3 text-sm
                              ${isThisCorrect 
                                ? 'border-success/40 bg-success/10' 
                                : wasSelected && !isThisCorrect 
                                  ? 'border-destructive/40 bg-destructive/10' 
                                  : 'border-border/30 bg-muted/20'
                              }
                            `}
                          >
                            <span className={`
                              w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                              ${isThisCorrect 
                                ? 'bg-success text-success-foreground' 
                                : wasSelected && !isThisCorrect 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'bg-muted text-muted-foreground'
                              }
                            `}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className={`
                              flex-1
                              ${isThisCorrect ? 'text-success font-medium' : ''}
                              ${wasSelected && !isThisCorrect ? 'text-destructive' : ''}
                              ${!isThisCorrect && !wasSelected ? 'text-muted-foreground' : ''}
                            `}>
                              {option}
                            </span>
                            {isThisCorrect && (
                              <CheckCircle className="w-4 h-4 text-success" />
                            )}
                            {wasSelected && !isThisCorrect && (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                            Explanation
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 pb-8">
          <button
            onClick={onBackToDashboard}
            className="w-full py-4 px-6 rounded-xl font-semibold btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};

export default MCQReview;
