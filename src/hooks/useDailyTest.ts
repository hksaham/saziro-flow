import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import {
  getOrCreateDailyTest as firebaseGetOrCreateDailyTest,
  getTodayTestResult,
  getTodayPracticeCount,
  saveTestResult,
  savePracticeResult,
  updateUserStatsAfterTest,
} from '@/lib/firebaseService';
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

  // Check user's daily test/practice status from Firebase
  const checkDailyStatus = useCallback(async () => {
    if (!user || !coachingId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔥 FIREBASE: Checking daily status for', user.uid);

      const [testResult, practiceCount] = await Promise.all([
        getTodayTestResult(user.uid, coachingId),
        getTodayPracticeCount(user.uid),
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

  // Get or create daily test for coaching
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

      // Fetch MCQs from Firestore mcq_sets collection
      const setsRef = collection(db, 'mcq_sets');
      let setsSnapshot = await getDocs(setsRef);

      // Seed if empty
      if (setsSnapshot.empty) {
        console.log('⚠️ No MCQ sets found, seeding...');
        await seedMCQsToFirestore();
        setsSnapshot = await getDocs(setsRef);
      }

      if (setsSnapshot.empty) {
        return { questions: [], dailyTestId: '', error: 'No MCQ sets available' };
      }

      const activeDoc =
        setsSnapshot.docs.find((d) => (d.data() as any)?.status === 'active') ||
        setsSnapshot.docs[0];
      const mcqSet = activeDoc.data() as MCQSet;

      // Get or create daily test record
      const { setId } = await firebaseGetOrCreateDailyTest(
        coachingId,
        mcqSet.questions
      );

      // Convert to legacy format
      const { convertToLegacyFormat } = await import('@/types/mcq');
      const questions = mcqSet.questions
        .slice(0, TEST_QUESTION_LIMIT)
        .map((q) => convertToLegacyFormat(q));

      console.log(`✅ FIREBASE: Loaded ${questions.length} test questions`);

      return { questions, dailyTestId: setId };
    } catch (err: any) {
      console.error('❌ FIREBASE: Error in getOrCreateDailyTest:', err);
      return { questions: [], dailyTestId: '', error: err.message };
    }
  }, [user, coachingId]);

  // Get practice questions
  const getPracticeQuestions = useCallback(async (): Promise<{
    questions: MCQQuestion[];
    setNumber: number;
    error?: string;
  }> => {
    if (!user) {
      return { questions: [], setNumber: 0, error: 'Not authenticated' };
    }

    try {
      console.log('🔥 FIREBASE: Getting practice questions');

      const practiceCount = await getTodayPracticeCount(user.uid);

      if (practiceCount >= MAX_PRACTICE_SETS_PER_DAY) {
        return {
          questions: [],
          setNumber: 0,
          error: `Daily limit reached (${MAX_PRACTICE_SETS_PER_DAY}/day)`,
        };
      }

      const nextSetNumber = practiceCount + 1;

      // Fetch MCQs from Firestore
      const setsRef = collection(db, 'mcq_sets');
      let setsSnapshot = await getDocs(setsRef);

      if (setsSnapshot.empty) {
        await seedMCQsToFirestore();
        setsSnapshot = await getDocs(setsRef);
      }

      if (setsSnapshot.empty) {
        return { questions: [], setNumber: 0, error: 'No MCQ sets available' };
      }

      const activeDoc =
        setsSnapshot.docs.find((d) => (d.data() as any)?.status === 'active') ||
        setsSnapshot.docs[0];
      const mcqSet = activeDoc.data() as MCQSet;

      const { convertToLegacyFormat } = await import('@/types/mcq');

      // Pick different questions based on set number for variety
      const startIdx =
        ((nextSetNumber - 1) * PRACTICE_QUESTION_LIMIT) % mcqSet.questions.length;
      const selectedQuestions = [];

      for (
        let i = 0;
        i < PRACTICE_QUESTION_LIMIT && i < mcqSet.questions.length;
        i++
      ) {
        const idx = (startIdx + i) % mcqSet.questions.length;
        selectedQuestions.push(mcqSet.questions[idx]);
      }

      const questions = selectedQuestions.map((q) => convertToLegacyFormat(q));

      console.log(
        `✅ FIREBASE: Loaded ${questions.length} practice questions (set #${nextSetNumber})`
      );

      return { questions, setNumber: nextSetNumber };
    } catch (err: any) {
      console.error('❌ FIREBASE: Error getting practice questions:', err);
      return { questions: [], setNumber: 0, error: err.message };
    }
  }, [user]);

  // Record test attempt completion
  const recordTestAttempt = useCallback(
    async (dailyTestId: string, performanceId: string): Promise<boolean> => {
      if (!user || !coachingId) return false;

      try {
        console.log('🔥 FIREBASE: Recording test attempt', dailyTestId);
        // The test result is already saved via saveTestResult
        // Just refresh status
        await checkDailyStatus();
        return true;
      } catch (err) {
        console.error('❌ FIREBASE: Error recording test attempt:', err);
        return false;
      }
    },
    [user, coachingId, checkDailyStatus]
  );

  // Record practice attempt
  const recordPracticeAttempt = useCallback(
    async (setNumber: number, performanceId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        console.log('🔥 FIREBASE: Recording practice attempt', setNumber);
        // Refresh status
        await checkDailyStatus();
        return true;
      } catch (err) {
        console.error('❌ FIREBASE: Error recording practice attempt:', err);
        return false;
      }
    },
    [user, checkDailyStatus]
  );

  // Check and reset streak if test was missed
  const checkStreakReset = useCallback(async (): Promise<boolean> => {
    // This is now handled in updateUserStatsAfterTest
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
