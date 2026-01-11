export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
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
