import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firebaseAuth } from '@/lib/firebase';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import { saveTestResult, savePracticeResult, saveMistakes, getUser } from '@/lib/firebaseService';
import type { MCQQuestion, MCQState, MCQSet } from '@/types/mcq';
import { useLeaderboard } from '@/hooks/useLeaderboard';

interface AnsweredQuestion {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  questionId: string;
  correctAnswer: number;
}

export const useMCQEngine = (
  classId: string = 'class_10',
  subject: string = 'Science',
  chapter: string = 'chapter_1',
  questionLimit: number = 30
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
  const [meta, setMeta] = useState<MCQSet['meta'] | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  
  // Use leaderboard hook for updating rankings after TEST submission
  const { updateLeaderboardForTest } = useLeaderboard();

  // Fetch MCQs from mcq_sets collection (new structure)
  const fetchMCQsFromSets = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    console.log('🔍 MCQ ENGINE: Starting to fetch MCQs from Firestore...');
    console.log('🔍 Firebase Project: studdy-buddy-bd');
    console.log(`🔍 Question Limit: ${questionLimit}`);

    const collectionName = 'mcq_sets';
    console.log('📁 Firestore read path:', collectionName);

    try {
      const setsRef = collection(db, collectionName);
      console.log(`📁 Querying collection: ${collectionName}`);

      let setsSnapshot;
      try {
        setsSnapshot = await getDocs(setsRef);
        console.log(`✅ Read successful. Found ${setsSnapshot.size} documents.`);
        console.log('📄 Document IDs:', setsSnapshot.docs.map(d => d.id));
      } catch (readError: any) {
        console.error('❌ FIRESTORE READ FAILED:', {
          message: readError?.message,
          code: readError?.code,
        });

        if (readError?.code === 'permission-denied' || readError?.message?.includes('permission')) {
          throw new Error('FIRESTORE PERMISSION DENIED: Firestore Security Rules are blocking READs to mcq_sets.');
        }
        throw readError;
      }

      // If no MCQ sets exist, seed the data
      if (setsSnapshot.empty) {
        console.log('⚠️ No MCQ sets found in Firestore. Attempting to seed from JSON...');
        const result = await seedMCQsToFirestore();

        if (!result.success) {
          console.error('❌ Seeding failed:', result.error);
          throw new Error(result.error || 'Failed to seed MCQs');
        }

        console.log(`✅ Seeded MCQ set: ${result.setId}`);

        // Fetch again after seeding
        const newSnapshot = await getDocs(setsRef);
        console.log(`📊 After seeding, found ${newSnapshot.size} documents`);
        console.log('📄 Document IDs (after seed):', newSnapshot.docs.map(d => d.id));

        if (newSnapshot.empty) {
          throw new Error('Failed to fetch seeded MCQs - documents not found after seed');
        }

        const firstDoc = newSnapshot.docs[0];
        const data = firstDoc.data() as MCQSet;

        console.log('🧾 RAW first document:', { id: firstDoc.id, data });

        setSetId(firstDoc.id);
        setMeta(data.meta);

        const { convertToLegacyFormat } = await import('@/types/mcq');
        let questions: MCQQuestion[] = data.questions.map(q => convertToLegacyFormat(q));

        // FIXED: Enforce question limit
        if (questions.length > questionLimit) {
          console.log(`📊 Limiting questions from ${questions.length} to ${questionLimit}`);
          questions = questions.slice(0, questionLimit);
        }

        console.log(`✅ Loaded ${questions.length} questions (limit: ${questionLimit})`);

        setState(prev => ({
          ...prev,
          questions,
          loading: false
        }));
        return;
      }

      // Get the first active set
      const activeDoc = setsSnapshot.docs.find(d => (d.data() as any)?.status === 'active') || setsSnapshot.docs[0];
      const data = activeDoc.data() as MCQSet;

      console.log('🧾 RAW active document:', { id: activeDoc.id, data });

      setSetId(activeDoc.id);
      setMeta(data.meta);

      const { convertToLegacyFormat } = await import('@/types/mcq');
      let questions: MCQQuestion[] = data.questions.map(q => convertToLegacyFormat(q));

      // FIXED: Enforce question limit
      if (questions.length > questionLimit) {
        console.log(`📊 Limiting questions from ${questions.length} to ${questionLimit}`);
        questions = questions.slice(0, questionLimit);
      }

      console.log(`✅ Loaded MCQ set: ${activeDoc.id} with ${questions.length} questions (limit: ${questionLimit})`);

      setState(prev => ({
        ...prev,
        questions,
        loading: false
      }));
    } catch (err: any) {
      console.error('❌ MCQ ENGINE ERROR:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load questions. Please try again.'
      }));
    }
  }, [questionLimit]);

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

  // Force submit unanswered (for anti-cheat)
  const forceSubmitUnanswered = useCallback(() => {
    console.log('🚨 FORCE SUBMIT: Marking all remaining questions as wrong');
    const remaining = state.questions.length - state.totalAnswered;
    setState(prev => ({
      ...prev,
      totalAnswered: prev.questions.length, // Mark all as answered
      answered: true
    }));
  }, [state.questions.length, state.totalAnswered]);

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

  // Save performance to Firebase (with mistake tracking)
  const savePerformance = useCallback(async (
    answeredQuestions: AnsweredQuestion[],
    mode: 'test' | 'practice',
    timeTakenSeconds: number = 0
  ) => {
    try {
      const currentUser = firebaseAuth.currentUser;
      
      if (!currentUser) {
        console.error('❌ Cannot save performance: No authenticated user');
        return { success: false, xpEarned: 0 };
      }

      // Get user's coaching ID from Firebase
      const firebaseUser = await getUser(currentUser.uid);
      const coachingId = firebaseUser?.coachingId;

      console.log(`📊 Saving performance for user ${currentUser.uid} to Firebase...`);

      const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
      const wrongCount = answeredQuestions.filter(q => !q.isCorrect).length;
      const totalQuestions = answeredQuestions.length;
      const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      const xpEarned = mode === 'test' ? (correctCount * 10) - (wrongCount * 5) : 0;
      const safeXp = Math.max(0, xpEarned);

      // Save to Firebase based on mode
      if (mode === 'test') {
        await saveTestResult(currentUser.uid, {
          setId: setId || `test_${Date.now()}`,
          coachingId: coachingId || '',
          correct: correctCount,
          wrong: wrongCount,
          score: scorePercentage,
          timeTakenSeconds,
        });
        console.log(`✅ FIREBASE: Test performance saved: ${correctCount}/${totalQuestions} correct, ${safeXp} XP earned`);
      } else {
        await savePracticeResult(currentUser.uid, {
          setId: setId || `practice_${Date.now()}`,
          correct: correctCount,
          wrong: wrongCount,
          score: scorePercentage,
        });
        console.log(`✅ FIREBASE: Practice performance saved: ${correctCount}/${totalQuestions} correct`);
      }

      // Save wrong answers to Firebase mistake notebook
      const wrongAnswers = answeredQuestions.filter(q => !q.isCorrect);
      if (wrongAnswers.length > 0) {
        const mistakeRecords = wrongAnswers.map(wa => {
          const question = state.questions[wa.questionIndex];
          return {
            questionId: `q_${wa.questionIndex}`,
            questionText: question?.question || `Question ${wa.questionIndex + 1}`,
            options: question?.options || [],
            selected: question?.options?.[wa.selectedOption] || String(wa.selectedOption),
            correct: question?.options?.[wa.correctAnswer] || String(wa.correctAnswer),
            subject: meta?.subject || 'Unknown',
            source: mode as 'test' | 'practice',
          };
        });

        await saveMistakes(currentUser.uid, mistakeRecords);
        console.log(`📝 FIREBASE: Saved ${wrongAnswers.length} wrong answers to mistake notebook`);
      }

      // ✅ UPDATE LEADERBOARD FOR TEST MODE ONLY
      if (mode === 'test') {
        console.log('📊 Updating leaderboard for TEST submission...');
        await updateLeaderboardForTest(correctCount, wrongCount, totalQuestions);
      } else {
        console.log('⏭️ Skipping leaderboard update for PRACTICE mode');
      }

      return { success: true, xpEarned: safeXp };
    } catch (err: any) {
      console.error('❌ Error saving performance:', {
        message: err?.message,
        code: err?.code,
      });
      return { success: false, xpEarned: 0 };
    }
  }, [state.questions, meta, updateLeaderboardForTest]);

  // Fetch MCQs on mount
  useEffect(() => {
    fetchMCQsFromSets();
  }, [fetchMCQsFromSets]);

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
    meta,
    setId,
    selectOption,
    submitAnswer,
    forceSubmitUnanswered,
    nextQuestion,
    prevQuestion,
    resetQuiz,
    savePerformance,
    refetch: fetchMCQsFromSets
  };
};
