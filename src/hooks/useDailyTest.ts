import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import {
  getOrCreateDailyTest as firebaseGetOrCreateDailyTest,
  getTodayTestResult,
  getTodayPracticeCount,
  getCoachingMCQSets,
  seedCoachingMCQSets,
} from '@/lib/firebaseService';
import {
  resolveQuestionPool,
} from '@/lib/customQuestionsService';
import type { MCQQuestion, MCQSet } from '@/types/mcq';

// STRICT LIMITS
const TEST_QUESTION_LIMIT = 30;
const PRACTICE_QUESTION_LIMIT = 15;
const MAX_PRACTICE_SETS_PER_DAY = 6;

interface DailyTestStatus {
  hasCompletedTest: boolean;
  canTakeTest: boolean;
  practiceSetsTaken: number;
  canTakePractice: boolean;
  remainingPracticeSets: number;
  dailyTestId: string | null;
}

export const useDailyTest = () => {
  const { user, coachingId } = useAuth();
  const [status, setStatus] = useState<DailyTestStatus>({
    hasCompletedTest: false,
    canTakeTest: true,
    practiceSetsTaken: 0,
    canTakePractice: true,
    remainingPracticeSets: MAX_PRACTICE_SETS_PER_DAY,
    dailyTestId: null,
  });
  const [loading, setLoading] = useState(true);

  const checkDailyStatus = useCallback(async () => {
    if (!user || !coachingId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔥 FIREBASE: Checking daily status for', user.id, 'in coaching', coachingId);

      const [testResult, practiceCount] = await Promise.all([
        getTodayTestResult(user.id, coachingId),
        getTodayPracticeCount(user.id, coachingId),
      ]);

      setStatus({
        hasCompletedTest: !!testResult,
        canTakeTest: !testResult,
        practiceSetsTaken: practiceCount,
        canTakePractice: practiceCount < MAX_PRACTICE_SETS_PER_DAY,
        remainingPracticeSets: MAX_PRACTICE_SETS_PER_DAY - practiceCount,
        dailyTestId: testResult?.setId || null,
      });

      console.log('✅ FIREBASE: Daily status loaded', {
        hasCompletedTest: !!testResult,
        practiceSetsTaken: practiceCount,
      });

      setLoading(false);
    } catch (err) {
      console.error('❌ FIREBASE: Error checking daily status:', err);
      setLoading(false);
    }
  }, [user, coachingId]);

  // -------------------------------------------------------
  // Core resolver: custom questions first, then global fallback
  // -------------------------------------------------------
  const loadQuestions = useCallback(async (): Promise<MCQQuestion[]> => {
    if (!coachingId) return [];

    // 1. Check for teacher-uploaded custom questions
    const { questions: customQs, source } = await resolveQuestionPool(coachingId);

    if (source === 'custom') {
      return customQs;
    }

    if (source === 'empty') {
      // Teacher disabled global questions but hasn't uploaded anything
      return [];
    }

    // source === 'global' — fall back to the SAZIRO Flow 900+ question bank
    let { docs, fromGlobal } = await getCoachingMCQSets(coachingId);

    if (docs.length === 0) {
      console.log('⚠️ No MCQ sets found, seeding to coaching...');
      await seedMCQsToFirestore(coachingId);
      const retry = await getCoachingMCQSets(coachingId);
      docs = retry.docs;
      fromGlobal = retry.fromGlobal;
    }

    if (docs.length === 0) return [];

    if (fromGlobal) {
      await seedCoachingMCQSets(coachingId);
    }

    const activeDoc =
      docs.find((d) => (d.data() as any)?.status === 'active') || docs[0];
    const mcqSet = activeDoc.data() as MCQSet;

    const { convertToLegacyFormat } = await import('@/types/mcq');
    return mcqSet.questions.map((q) => convertToLegacyFormat(q));
  }, [coachingId]);

  // -------------------------------------------------------
  // Daily test
  // -------------------------------------------------------
  const getOrCreateDailyTest = useCallback(async (): Promise<{
    questions: MCQQuestion[];
    dailyTestId: string;
    error?: string;
  }> => {
    if (!user || !coachingId) {
      return { questions: [], dailyTestId: '', error: 'Not authenticated or no coaching' };
    }

    try {
      console.log('🔥 FIREBASE: Getting daily test for coaching', coachingId);

      const allQuestions = await loadQuestions();

      if (allQuestions.length === 0) {
        return {
          questions: [],
          dailyTestId: '',
          error: 'No questions available. Your teacher has disabled global questions and has not uploaded any custom questions yet.',
        };
      }

      const { setId } = await firebaseGetOrCreateDailyTest(coachingId, allQuestions);
      const questions = allQuestions.slice(0, TEST_QUESTION_LIMIT);

      console.log(`✅ FIREBASE: Loaded ${questions.length} test questions`);
      return { questions, dailyTestId: setId };
    } catch (err: any) {
      console.error('❌ FIREBASE: Error in getOrCreateDailyTest:', err);
      return { questions: [], dailyTestId: '', error: err.message };
    }
  }, [user, coachingId, loadQuestions]);

  // -------------------------------------------------------
  // Practice
  // -------------------------------------------------------
  const getPracticeQuestions = useCallback(async (): Promise<{
    questions: MCQQuestion[];
    setNumber: number;
    error?: string;
  }> => {
    if (!user || !coachingId) {
      return { questions: [], setNumber: 0, error: 'Not authenticated' };
    }

    try {
      console.log('🔥 FIREBASE: Getting practice questions');

      const practiceCount = await getTodayPracticeCount(user.id, coachingId);

      if (practiceCount >= MAX_PRACTICE_SETS_PER_DAY) {
        return {
          questions: [],
          setNumber: 0,
          error: `Daily limit reached (${MAX_PRACTICE_SETS_PER_DAY}/day)`,
        };
      }

      const nextSetNumber = practiceCount + 1;
      const allQuestions = await loadQuestions();

      if (allQuestions.length === 0) {
        return {
          questions: [],
          setNumber: 0,
          error: 'No questions available. Your teacher has not uploaded any custom questions yet.',
        };
      }

      const startIdx =
        ((nextSetNumber - 1) * PRACTICE_QUESTION_LIMIT) % allQuestions.length;
      const selectedQuestions: MCQQuestion[] = [];

      for (let i = 0; i < PRACTICE_QUESTION_LIMIT && i < allQuestions.length; i++) {
        const idx = (startIdx + i) % allQuestions.length;
        selectedQuestions.push(allQuestions[idx]);
      }

      console.log(
        `✅ FIREBASE: Loaded ${selectedQuestions.length} practice questions (set #${nextSetNumber})`
      );

      return { questions: selectedQuestions, setNumber: nextSetNumber };
    } catch (err: any) {
      console.error('❌ FIREBASE: Error getting practice questions:', err);
      return { questions: [], setNumber: 0, error: err.message };
    }
  }, [user, coachingId, loadQuestions]);

  const recordTestAttempt = useCallback(
    async (dailyTestId: string, performanceId: string): Promise<boolean> => {
      if (!user || !coachingId) return false;
      try {
        console.log('🔥 FIREBASE: Recording test attempt', dailyTestId);
        await checkDailyStatus();
        return true;
      } catch (err) {
        console.error('❌ FIREBASE: Error recording test attempt:', err);
        return false;
      }
    },
    [user, coachingId, checkDailyStatus]
  );

  const recordPracticeAttempt = useCallback(
    async (setNumber: number, performanceId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        console.log('🔥 FIREBASE: Recording practice attempt', setNumber);
        await checkDailyStatus();
        return true;
      } catch (err) {
        console.error('❌ FIREBASE: Error recording practice attempt:', err);
        return false;
      }
    },
    [user, checkDailyStatus]
  );

  const checkStreakReset = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  useEffect(() => {
    checkDailyStatus();
  }, [checkDailyStatus]);

  return {
    status,
    loading,
    getOrCreateDailyTest,
    getPracticeQuestions,
    recordTestAttempt,
    recordPracticeAttempt,
    checkStreakReset,
    refetch: checkDailyStatus,
    TEST_QUESTION_LIMIT,
    PRACTICE_QUESTION_LIMIT,
    MAX_PRACTICE_SETS_PER_DAY,
  };
};