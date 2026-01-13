import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import type { MCQQuestion, MCQState, MCQSet } from '@/types/mcq';

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
  questionLimit: number = 30 // FIXED: Enforce question limit
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

  // FIXED: Save performance to Supabase (with mistake tracking)
  const savePerformance = useCallback(async (
    answeredQuestions: AnsweredQuestion[],
    mode: 'test' | 'practice',
    timeTakenSeconds: number = 0
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ Cannot save performance: No authenticated user');
        return { success: false, xpEarned: 0 };
      }

      // Get user's coaching ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('coaching_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log(`📊 Saving performance for user ${user.id}...`);

      const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
      const wrongCount = answeredQuestions.filter(q => !q.isCorrect).length;
      const totalQuestions = answeredQuestions.length;
      const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      const xpEarned = correctCount * 10;

      // Insert performance record
      const { data: perfData, error: perfError } = await supabase
        .from('mcq_performance')
        .insert({
          user_id: user.id,
          coaching_id: profile?.coaching_id,
          mode,
          total_questions: totalQuestions,
          correct_answers: correctCount,
          wrong_answers: wrongCount,
          score_percentage: scorePercentage,
          time_taken_seconds: timeTakenSeconds,
          xp_earned: xpEarned
        })
        .select()
        .single();

      if (perfError) {
        console.error('❌ Error saving performance:', perfError);
        return { success: false, xpEarned: 0 };
      }

      console.log(`✅ Performance saved: ${correctCount}/${totalQuestions} correct, ${xpEarned} XP earned`);

      // Save wrong answers for mistake notebook
      const wrongAnswers = answeredQuestions.filter(q => !q.isCorrect);
      if (wrongAnswers.length > 0 && perfData) {
        const wrongAnswerRecords = wrongAnswers.map(wa => {
          const question = state.questions[wa.questionIndex];
          return {
            user_id: user.id,
            performance_id: perfData.id,
            question_text: question?.question || `Question ${wa.questionIndex + 1}`,
            options: question?.options || [],
            selected_answer: question?.options?.[wa.selectedOption] || String(wa.selectedOption),
            correct_answer: question?.options?.[wa.correctAnswer] || String(wa.correctAnswer),
            subject: meta?.subject || 'Unknown'
          };
        });

        const { error: wrongError } = await supabase
          .from('mcq_wrong_answers')
          .insert(wrongAnswerRecords);

        if (wrongError) {
          console.error('❌ Error saving wrong answers:', wrongError);
        } else {
          console.log(`📝 Saved ${wrongAnswers.length} wrong answers to mistake notebook`);
        }
      }

      return { success: true, xpEarned };
    } catch (err: any) {
      console.error('❌ Error saving performance:', {
        message: err?.message,
        code: err?.code,
      });
      return { success: false, xpEarned: 0 };
    }
  }, [state.questions, meta]);

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
