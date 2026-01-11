import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MCQQuestion, MCQPerformance, MCQState } from '@/types/mcq';

const SAMPLE_MCQS: Omit<MCQQuestion, 'id'>[] = [
  {
    question: "What is the SI unit of force?",
    options: ["Newton", "Joule", "Watt", "Pascal"],
    correctIndex: 0,
    explanation: "Force is measured in Newton (N).",
    difficulty: "easy"
  },
  {
    question: "Which law explains action and reaction?",
    options: ["First Law of Motion", "Second Law of Motion", "Third Law of Motion", "Law of Gravitation"],
    correctIndex: 2,
    explanation: "Newton's Third Law states that every action has an equal and opposite reaction.",
    difficulty: "easy"
  },
  {
    question: "If mass is constant, force is proportional to?",
    options: ["Velocity", "Acceleration", "Momentum", "Energy"],
    correctIndex: 1,
    explanation: "According to F = ma, force is proportional to acceleration.",
    difficulty: "medium"
  }
];

export const useMCQEngine = (
  classId: string = 'class_10',
  subject: string = 'physics',
  chapter: string = 'chapter_1'
) => {
  const [state, setState] = useState<MCQState>({
    questions: [],
    currentIndex: 0,
    selectedOption: null,
    answered: false,
    score: 0,
    totalAnswered: 0,
    loading: true,
    error: null
  });

  const questionsPath = `mcqs/${classId}/${subject}/${chapter}/questions`;

  // Seed sample MCQs if database is empty
  const seedMCQs = useCallback(async () => {
    try {
      const questionsRef = collection(db, questionsPath);
      
      for (let i = 0; i < SAMPLE_MCQS.length; i++) {
        const mcq = SAMPLE_MCQS[i];
        const docRef = doc(questionsRef, `q${i + 1}`);
        await setDoc(docRef, mcq);
      }
      
      console.log('Sample MCQs seeded successfully');
      return true;
    } catch (err) {
      console.error('Error seeding MCQs:', err);
      return false;
    }
  }, [questionsPath]);

  // Fetch MCQs from Firestore
  const fetchMCQs = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const questionsRef = collection(db, questionsPath);
      const snapshot = await getDocs(questionsRef);
      
      // If no MCQs exist, seed sample data
      if (snapshot.empty) {
        console.log('No MCQs found, seeding sample data...');
        const seeded = await seedMCQs();
        if (seeded) {
          // Fetch again after seeding
          const newSnapshot = await getDocs(questionsRef);
          const questions: MCQQuestion[] = newSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as MCQQuestion[];
          
          setState(prev => ({
            ...prev,
            questions,
            loading: false
          }));
          return;
        }
      }
      
      const questions: MCQQuestion[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MCQQuestion[];
      
      setState(prev => ({
        ...prev,
        questions,
        loading: false
      }));
    } catch (err) {
      console.error('Error fetching MCQs:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load questions. Please try again.'
      }));
    }
  }, [questionsPath, seedMCQs]);

  // Select an option
  const selectOption = useCallback((optionIndex: number) => {
    if (state.answered) return;
    setState(prev => ({ ...prev, selectedOption: optionIndex }));
  }, [state.answered]);

  // Submit answer
  const submitAnswer = useCallback(() => {
    if (state.selectedOption === null || state.answered) return;
    
    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = state.selectedOption === currentQuestion.correctIndex;
    
    setState(prev => ({
      ...prev,
      answered: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      totalAnswered: prev.totalAnswered + 1
    }));
    
    return isCorrect;
  }, [state.selectedOption, state.answered, state.questions, state.currentIndex]);

  // Go to next question
  const nextQuestion = useCallback(() => {
    if (state.currentIndex < state.questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        answered: false
      }));
    }
  }, [state.currentIndex, state.questions.length]);

  // Go to previous question
  const prevQuestion = useCallback(() => {
    if (state.currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        selectedOption: null,
        answered: false
      }));
    }
  }, [state.currentIndex]);

  // Reset quiz
  const resetQuiz = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: 0,
      selectedOption: null,
      answered: false,
      score: 0,
      totalAnswered: 0
    }));
  }, []);

  // Save performance to Firestore
  const savePerformance = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const perfPath = `users/${userId}/mcqPerformance/${classId}/${subject}/${chapter}`;
      const perfRef = doc(db, perfPath);
      const perfSnap = await getDoc(perfRef);
      
      if (perfSnap.exists()) {
        const existing = perfSnap.data() as MCQPerformance;
        await updateDoc(perfRef, {
          totalAttempted: existing.totalAttempted + state.totalAnswered,
          correct: existing.correct + state.score,
          wrong: existing.wrong + (state.totalAnswered - state.score),
          lastAttemptedAt: serverTimestamp()
        });
      } else {
        await setDoc(perfRef, {
          totalAttempted: state.totalAnswered,
          correct: state.score,
          wrong: state.totalAnswered - state.score,
          lastAttemptedAt: serverTimestamp()
        });
      }
      
      console.log('Performance saved successfully');
    } catch (err) {
      console.error('Error saving performance:', err);
    }
  }, [classId, subject, chapter, state.totalAnswered, state.score]);

  // Fetch MCQs on mount
  useEffect(() => {
    fetchMCQs();
  }, [fetchMCQs]);

  const currentQuestion = state.questions[state.currentIndex] || null;
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const isFirstQuestion = state.currentIndex === 0;
  const progress = state.questions.length > 0 
    ? ((state.currentIndex + 1) / state.questions.length) * 100 
    : 0;

  return {
    ...state,
    currentQuestion,
    isLastQuestion,
    isFirstQuestion,
    progress,
    selectOption,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    resetQuiz,
    savePerformance,
    refetch: fetchMCQs
  };
};
