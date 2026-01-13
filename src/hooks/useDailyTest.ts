import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
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

interface DailyTest {
  id: string;
  coaching_id: string;
  test_date: string;
  question_ids: string[];
  mcq_set_id: string;
}

export const useDailyTest = () => {
  const { user, coachingId } = useAuth();
  const [status, setStatus] = useState<DailyTestStatus>({
    hasCompletedTest: false,
    canTakeTest: true,
    practiceSetsTaken: 0,
    canTakePractice: true,
    remainingPracticeSets: MAX_PRACTICE_SETS_PER_DAY,
    dailyTestId: null
  });
  const [loading, setLoading] = useState(true);

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Check user's daily test/practice status
  const checkDailyStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const today = getTodayDateString();

    try {
      // Check if user has completed daily test today
      const { data: testAttempt, error: testError } = await supabase
        .from('daily_test_attempts')
        .select('id, daily_test_id')
        .eq('user_id', user.id)
        .eq('test_date', today)
        .maybeSingle();

      if (testError) console.error('Error checking test attempt:', testError);

      // Count practice attempts today
      const { data: practiceAttempts, error: practiceError } = await supabase
        .from('practice_attempts')
        .select('id, set_number')
        .eq('user_id', user.id)
        .eq('attempt_date', today);

      if (practiceError) console.error('Error checking practice attempts:', practiceError);

      const practiceCount = practiceAttempts?.length || 0;

      setStatus({
        hasCompletedTest: !!testAttempt,
        canTakeTest: !testAttempt,
        practiceSetsTaken: practiceCount,
        canTakePractice: practiceCount < MAX_PRACTICE_SETS_PER_DAY,
        remainingPracticeSets: MAX_PRACTICE_SETS_PER_DAY - practiceCount,
        dailyTestId: testAttempt?.daily_test_id || null
      });

      setLoading(false);
    } catch (err) {
      console.error('Error checking daily status:', err);
      setLoading(false);
    }
  }, [user]);

  // Get or create daily test for coaching
  const getOrCreateDailyTest = useCallback(async (): Promise<{
    questions: MCQQuestion[];
    dailyTestId: string;
    error?: string;
  }> => {
    if (!user || !coachingId) {
      return { questions: [], dailyTestId: '', error: 'Not authenticated or no coaching' };
    }

    const today = getTodayDateString();

    try {
      // First, check if daily test already exists for this coaching + date
      const { data: existingTest, error: fetchError } = await supabase
        .from('daily_tests')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('test_date', today)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching daily test:', fetchError);
      }

      let dailyTest: DailyTest;

      if (existingTest) {
        console.log('📋 Found existing daily test for today:', existingTest.id);
        dailyTest = existingTest as DailyTest;
      } else {
        // Create new daily test for coaching
        console.log('📝 Creating new daily test for coaching:', coachingId);
        
        // Fetch MCQs from Firestore
        const setsRef = collection(db, 'mcq_sets');
        let setsSnapshot = await getDocs(setsRef);

        // Seed if empty
        if (setsSnapshot.empty) {
          await seedMCQsToFirestore();
          setsSnapshot = await getDocs(setsRef);
        }

        if (setsSnapshot.empty) {
          return { questions: [], dailyTestId: '', error: 'No MCQ sets available' };
        }

        const activeDoc = setsSnapshot.docs.find(d => (d.data() as any)?.status === 'active') || setsSnapshot.docs[0];
        const mcqSet = activeDoc.data() as MCQSet;

        // Select exactly 30 questions (no shuffle - same for all students)
        const selectedQuestionIds = mcqSet.questions
          .slice(0, TEST_QUESTION_LIMIT)
          .map((_, idx) => `q_${idx}`);

        // Insert new daily test
        const { data: newTest, error: insertError } = await supabase
          .from('daily_tests')
          .insert({
            coaching_id: coachingId,
            test_date: today,
            question_ids: selectedQuestionIds,
            mcq_set_id: activeDoc.id
          })
          .select()
          .single();

        if (insertError) {
          // Handle race condition - test might have been created by another user
          if (insertError.code === '23505') {
            const { data: raceTest } = await supabase
              .from('daily_tests')
              .select('*')
              .eq('coaching_id', coachingId)
              .eq('test_date', today)
              .single();
            
            if (raceTest) {
              dailyTest = raceTest as DailyTest;
            } else {
              return { questions: [], dailyTestId: '', error: 'Failed to create daily test' };
            }
          } else {
            console.error('Error creating daily test:', insertError);
            return { questions: [], dailyTestId: '', error: insertError.message };
          }
        } else {
          dailyTest = newTest as DailyTest;
        }

        console.log('✅ Created daily test:', dailyTest.id);
      }

      // Now fetch the actual questions from Firestore based on the stored set
      const setsRef = collection(db, 'mcq_sets');
      const setsSnapshot = await getDocs(setsRef);
      const setDoc = setsSnapshot.docs.find(d => d.id === dailyTest.mcq_set_id) || setsSnapshot.docs[0];
      const mcqSet = setDoc?.data() as MCQSet;

      if (!mcqSet?.questions) {
        return { questions: [], dailyTestId: dailyTest.id, error: 'Failed to load questions' };
      }

      // Convert to legacy format and limit to exactly 30
      const { convertToLegacyFormat } = await import('@/types/mcq');
      const questions = mcqSet.questions
        .slice(0, TEST_QUESTION_LIMIT)
        .map(q => convertToLegacyFormat(q));

      console.log(`✅ Loaded ${questions.length} questions for daily test`);

      return { questions, dailyTestId: dailyTest.id };
    } catch (err: any) {
      console.error('Error in getOrCreateDailyTest:', err);
      return { questions: [], dailyTestId: '', error: err.message };
    }
  }, [user, coachingId]);

  // Get practice questions (from mistake notebook first, then fallback)
  const getPracticeQuestions = useCallback(async (): Promise<{
    questions: MCQQuestion[];
    setNumber: number;
    error?: string;
  }> => {
    if (!user) {
      return { questions: [], setNumber: 0, error: 'Not authenticated' };
    }

    const today = getTodayDateString();

    try {
      // Check how many practice sets taken today
      const { data: practiceAttempts } = await supabase
        .from('practice_attempts')
        .select('set_number')
        .eq('user_id', user.id)
        .eq('attempt_date', today)
        .order('set_number', { ascending: false });

      const currentSetCount = practiceAttempts?.length || 0;
      
      if (currentSetCount >= MAX_PRACTICE_SETS_PER_DAY) {
        return { questions: [], setNumber: 0, error: `Daily limit reached (${MAX_PRACTICE_SETS_PER_DAY}/day)` };
      }

      const nextSetNumber = currentSetCount + 1;

      // Priority 1: Get mistakes from last 30 days (practice mistakes first)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: mistakeData } = await supabase
        .from('mcq_wrong_answers')
        .select('question_text, options, correct_answer, subject')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(PRACTICE_QUESTION_LIMIT);

      let questions: MCQQuestion[] = [];

      if (mistakeData && mistakeData.length >= PRACTICE_QUESTION_LIMIT) {
        // Use mistakes as practice questions
        console.log(`📚 Using ${PRACTICE_QUESTION_LIMIT} questions from mistake notebook`);
        questions = mistakeData.slice(0, PRACTICE_QUESTION_LIMIT).map((m, idx) => {
          const options = Array.isArray(m.options) ? m.options as string[] : [];
          const correctIdx = options.findIndex(o => o === m.correct_answer);
          return {
            id: `mistake_${idx}`,
            question: m.question_text,
            options: options,
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: `Correct answer: ${m.correct_answer}`,
            difficulty: 'medium' as const
          };
        });
      } else {
        // Fallback: fetch from Firestore MCQ sets
        console.log('📖 Fetching practice questions from MCQ sets');
        const setsRef = collection(db, 'mcq_sets');
        let setsSnapshot = await getDocs(setsRef);

        if (setsSnapshot.empty) {
          await seedMCQsToFirestore();
          setsSnapshot = await getDocs(setsRef);
        }

        if (!setsSnapshot.empty) {
          const activeDoc = setsSnapshot.docs.find(d => (d.data() as any)?.status === 'active') || setsSnapshot.docs[0];
          const mcqSet = activeDoc.data() as MCQSet;

          const { convertToLegacyFormat } = await import('@/types/mcq');
          
          // For practice, pick different questions based on set number to add variety
          const startIdx = ((nextSetNumber - 1) * PRACTICE_QUESTION_LIMIT) % mcqSet.questions.length;
          const selectedQuestions = [];
          
          for (let i = 0; i < PRACTICE_QUESTION_LIMIT && i < mcqSet.questions.length; i++) {
            const idx = (startIdx + i) % mcqSet.questions.length;
            selectedQuestions.push(mcqSet.questions[idx]);
          }

          questions = selectedQuestions.map(q => convertToLegacyFormat(q));
        }
      }

      console.log(`✅ Prepared ${questions.length} practice questions (set #${nextSetNumber})`);

      return { questions, setNumber: nextSetNumber };
    } catch (err: any) {
      console.error('Error getting practice questions:', err);
      return { questions: [], setNumber: 0, error: err.message };
    }
  }, [user]);

  // Record test attempt completion
  const recordTestAttempt = useCallback(async (
    dailyTestId: string,
    performanceId: string
  ): Promise<boolean> => {
    if (!user || !coachingId) return false;

    const today = getTodayDateString();

    try {
      const { error } = await supabase
        .from('daily_test_attempts')
        .insert({
          user_id: user.id,
          coaching_id: coachingId,
          daily_test_id: dailyTestId,
          test_date: today,
          performance_id: performanceId
        });

      if (error) {
        // Duplicate attempt - already recorded
        if (error.code === '23505') {
          console.log('⚠️ Test attempt already recorded');
          return true;
        }
        console.error('Error recording test attempt:', error);
        return false;
      }

      console.log('✅ Daily test attempt recorded');
      
      // Refresh status
      await checkDailyStatus();
      return true;
    } catch (err) {
      console.error('Error recording test attempt:', err);
      return false;
    }
  }, [user, coachingId, checkDailyStatus]);

  // Record practice attempt
  const recordPracticeAttempt = useCallback(async (
    setNumber: number,
    performanceId: string
  ): Promise<boolean> => {
    if (!user) return false;

    const today = getTodayDateString();

    try {
      const { error } = await supabase
        .from('practice_attempts')
        .insert({
          user_id: user.id,
          coaching_id: coachingId,
          attempt_date: today,
          set_number: setNumber,
          performance_id: performanceId
        });

      if (error) {
        console.error('Error recording practice attempt:', error);
        return false;
      }

      console.log(`✅ Practice attempt #${setNumber} recorded`);
      
      // Refresh status
      await checkDailyStatus();
      return true;
    } catch (err) {
      console.error('Error recording practice attempt:', err);
      return false;
    }
  }, [user, coachingId, checkDailyStatus]);

  // Check and reset streak if test was missed
  const checkStreakReset = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('last_activity_date, current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !stats) return false;

      const lastActivity = stats.last_activity_date;
      if (!lastActivity) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastDate = new Date(lastActivity);
      lastDate.setHours(0, 0, 0, 0);
      
      const daysSinceLastActivity = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // If more than 1 day has passed without a test, reset streak
      if (daysSinceLastActivity > 1 && stats.current_streak > 0) {
        console.log(`⚠️ Streak reset: ${daysSinceLastActivity} days since last test`);
        
        await supabase
          .from('user_stats')
          .update({ current_streak: 0 })
          .eq('user_id', user.id);

        return true; // Streak was reset
      }

      return false;
    } catch (err) {
      console.error('Error checking streak reset:', err);
      return false;
    }
  }, [user]);

  useEffect(() => {
    checkDailyStatus();
    checkStreakReset();
  }, [checkDailyStatus, checkStreakReset]);

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
    MAX_PRACTICE_SETS_PER_DAY
  };
};
