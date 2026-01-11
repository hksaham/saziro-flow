export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  correctOptionId: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  subject?: string;
  chapter?: string;
}

export interface MCQSet {
  id: string;
  title: string;
  type: 'daily' | 'practice';
  coachingId: string;
  date: string; // YYYY-MM-DD format for daily tests
  questionIds: string[];
  totalQuestions: number;
  timePerQuestion: number; // in seconds
  createdAt: Date;
}

export interface MCQAttempt {
  id: string;
  setId: string;
  userId: string;
  coachingId: string;
  type: 'daily' | 'practice';
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  answers: MCQAnswer[];
  totalCorrect: number;
  totalWrong: number;
  xpGained: number;
  xpLost: number;
  netXP: number;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
}

export interface MCQAnswer {
  questionId: string;
  questionIndex: number;
  selectedOptionId: string | null;
  isCorrect: boolean;
  isTimeout: boolean;
  answeredAt: Date;
  timeTaken: number; // in seconds
}

export interface UserStats {
  userId: string;
  coachingId: string;
  totalXP: number;
  currentStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
  totalMCQsAttempted: number;
  totalCorrect: number;
  totalWrong: number;
  dailyTestsCompleted: number;
  practiceTestsCompleted: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  coachingId: string;
  totalXP: number;
  streak: number;
}

export interface MCQEngineState {
  currentSet: MCQSet | null;
  currentAttempt: MCQAttempt | null;
  currentQuestion: MCQQuestion | null;
  currentQuestionIndex: number;
  timeRemaining: number;
  isLoading: boolean;
  error: string | null;
}
