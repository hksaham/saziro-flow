import { useState, useEffect, useCallback } from 'react';
import { firebaseAuth } from '@/lib/firebase';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import {
  saveTestResultAtomic,
  savePracticeResult,
  saveMistakes,
  getUser,
  getCoachingMCQSets,
  seedCoachingMCQSets,
} from '@/lib/firebaseService';
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
    error: null,
  });
  const [meta, setMeta] = useState<MCQSet['meta'] | null>(null);
  const [setId, setSetId] = useState<string | null>(null);

  const fetchMCQsFromSets = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    console.log('🔍 MCQ ENGINE: Fetching MCQs...');

    try {
      // Get user's active coaching to load coaching-scoped MCQ sets
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) throw new Error('Not authenticated');

      const firebaseUser = await getUser(fbUser.uid);
      const coachingId = firebaseUser?.activeCoachingId;

      if (!coachingId) throw new Error('No active coaching');

      // Try coaching-scoped MCQ sets first, fallback to global
      let { docs: setsDocs, fromGlobal } = await getCoachingMCQSets(coachingId);

      if (setsDocs.length === 0) {
        console.log('⚠️ No MCQ sets found. Seeding to coaching server...');
        await seedMCQsToFirestore(coachingId);
        const retry = await getCoachingMCQSets(coachingId);
        setsDocs = retry.docs;
        fromGlobal = retry.fromGlobal;
      }

      if (setsDocs.length === 0) {
        throw new Error('No MCQ sets available after seeding');
      }

      // If sets are from global, copy them to coaching for future use
      if (fromGlobal) {
        await seedCoachingMCQSets(coachingId);
      }

      const activeDoc =
        setsDocs.find((d) => (d.data() as any)?.status === 'active') || setsDocs[0];
      const data = activeDoc.data() as MCQSet;

      setSetId(activeDoc.id);
      setMeta(data.meta);

      const { convertToLegacyFormat } = await import('@/types/mcq');
      let questions: MCQQuestion[] = data.questions.map((q) => convertToLegacyFormat(q));

      if (questions.length > questionLimit) {
        questions = questions.slice(0, questionLimit);
      }

      console.log(
        `✅ Loaded MCQ set: ${activeDoc.id} (${fromGlobal ? 'global fallback' : 'coaching-scoped'}) with ${questions.length} questions`
      );

      setState((prev) => ({ ...prev, questions, loading: false }));
    } catch (err: any) {
      console.error('❌ MCQ ENGINE ERROR:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load questions.',
      }));
    }
  }, [questionLimit]);

  const selectOption = useCallback(
    (optionIndex: number) => {
      if (state.answered) return;
      setState((prev) => ({ ...prev, selectedOption: optionIndex }));
    },
    [state.answered]
  );

  const submitAnswer = useCallback(() => {
    if (state.selectedOption === null || state.answered) return;

    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = state.selectedOption === currentQuestion.correctIndex;

    setState((prev) => ({
      ...prev,
      answered: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      totalAnswered: prev.totalAnswered + 1,
    }));

    return isCorrect;
  }, [state.selectedOption, state.answered, state.questions, state.currentIndex]);

  const forceSubmitUnanswered = useCallback(() => {
    setState((prev) => ({
      ...prev,
      totalAnswered: prev.questions.length,
      answered: true,
    }));
  }, [state.questions.length, state.totalAnswered]);

  const nextQuestion = useCallback(() => {
    if (state.currentIndex < state.questions.length - 1) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        answered: false,
      }));
    }
  }, [state.currentIndex, state.questions.length]);

  const prevQuestion = useCallback(() => {
    if (state.currentIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        selectedOption: null,
        answered: false,
      }));
    }
  }, [state.currentIndex]);

  const resetQuiz = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: 0,
      selectedOption: null,
      answered: false,
      score: 0,
      totalAnswered: 0,
    }));
  }, []);

  const savePerformance = useCallback(
    async (
      answeredQuestions: AnsweredQuestion[],
      mode: 'test' | 'practice',
      timeTakenSeconds: number = 0
    ) => {
      try {
        const fbUser = firebaseAuth.currentUser;
        if (!fbUser) {
          console.error('❌ Cannot save performance: No authenticated user');
          return { success: false, xpEarned: 0 };
        }

        const firebaseUser = await getUser(fbUser.uid);
        const coachingId = firebaseUser?.activeCoachingId;

        if (!coachingId) {
          console.error('❌ Cannot save performance: No active coaching');
          return { success: false, xpEarned: 0 };
        }

        console.log(`📊 Saving performance to coaching server ${coachingId}...`);

        const correctCount = answeredQuestions.filter((q) => q.isCorrect).length;
        const wrongCount = answeredQuestions.filter((q) => !q.isCorrect).length;
        const totalQuestions = answeredQuestions.length;
        const scorePercentage =
          totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        const xpEarned =
          mode === 'test' ? correctCount * 10 - wrongCount * 5 : 0;
        const safeXp = Math.max(0, xpEarned);

        if (mode === 'test') {
          const atomicResult = await saveTestResultAtomic(fbUser.uid, coachingId, {
            setId: setId || `test_${Date.now()}`,
            correct: correctCount,
            wrong: wrongCount,
            score: scorePercentage,
            timeTakenSeconds,
          });
          console.log(
            `✅ ATOMIC: Test saved: ${correctCount}/${totalQuestions}, ${atomicResult.xpEarned} XP`
          );
        } else {
          await savePracticeResult(fbUser.uid, coachingId, {
            setId: setId || `practice_${Date.now()}`,
            correct: correctCount,
            wrong: wrongCount,
            score: scorePercentage,
          });
          console.log(`✅ Practice saved to coaching server`);
        }

        return { success: true, xpEarned: safeXp };
      } catch (err: any) {
        console.error('❌ Error saving performance:', err);
        return { success: false, xpEarned: 0 };
      }
    },
    [state.questions, meta, setId]
  );

  useEffect(() => {
    fetchMCQsFromSets();
  }, [fetchMCQsFromSets]);

  const currentQuestion = state.questions[state.currentIndex] || null;
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const isFirstQuestion = state.currentIndex === 0;
  const progress =
    state.questions.length > 0
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
    refetch: fetchMCQsFromSets,
  };
};
