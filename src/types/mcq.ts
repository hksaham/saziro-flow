// Legacy format (for backward compatibility)
export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// New format from mcq_sets collection
export interface MCQSetQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  chapter: string;
  topic: string;
  marks: number;
}

export interface MCQSetMeta {
  board: string;
  class: string;
  subject: string;
  totalQuestions: number;
  timePerQuestion: number;
  difficulty: string;
  createdFor: string;
  type: 'daily-test' | 'practice';
}

export interface MCQSet {
  meta: MCQSetMeta;
  questions: MCQSetQuestion[];
  createdAt: Date;
  source: string;
  status: 'active' | 'inactive';
}

export interface MCQPerformance {
  totalAttempted: number;
  correct: number;
  wrong: number;
  lastAttemptedAt: Date | null;
}

export interface MCQState {
  questions: MCQQuestion[];
  currentIndex: number;
  selectedOption: number | null;
  answered: boolean;
  score: number;
  totalAnswered: number;
  loading: boolean;
  error: string | null;
}

// Utility to convert MCQSetQuestion to MCQQuestion format
export function convertToLegacyFormat(setQuestion: MCQSetQuestion): MCQQuestion {
  const optionKeys = Object.keys(setQuestion.options).sort();
  const options = optionKeys.map(key => setQuestion.options[key]);
  const correctIndex = optionKeys.indexOf(setQuestion.correctAnswer);

  return {
    id: setQuestion.id,
    question: setQuestion.question,
    options,
    correctIndex,
    explanation: setQuestion.explanation,
    difficulty: 'medium' // Default since original structure doesn't have per-question difficulty
  };
}
