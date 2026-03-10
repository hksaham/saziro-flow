import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserStats,
  getTodayPerformance,
} from '@/lib/firebaseService';

interface UserStats {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface TodayPerformance {
  testAttempts: number;
  testCorrect: number;
  testTotal: number;
  testAccuracy: number;
  testXpEarned: number;
  practiceAttempts: number;
  practiceCorrect: number;
  practiceTotal: number;
  practiceAccuracy: number;
}

export const useUserStats = () => {
  const { user, coachingId } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [todayPerformance, setTodayPerformance] = useState<TodayPerformance>({
    testAttempts: 0,
    testCorrect: 0,
    testTotal: 0,
    testAccuracy: 0,
    testXpEarned: 0,
    practiceAttempts: 0,
    practiceCorrect: 0,
    practiceTotal: 0,
    practiceAccuracy: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user || !coachingId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔥 FIREBASE: Fetching user stats from coaching server', user.id, coachingId);

      const [firebaseStats, performance] = await Promise.all([
        getUserStats(user.id, coachingId),
        getTodayPerformance(user.id, coachingId),
      ]);

      if (firebaseStats) {
        setStats({
          total_xp: firebaseStats.totalXp,
          current_streak: firebaseStats.currentStreak,
          longest_streak: firebaseStats.longestStreak,
          last_activity_date: firebaseStats.lastActivityDate,
        });
      } else {
        setStats({
          total_xp: 0,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        });
      }

      setTodayPerformance({
        testAttempts: 0,
        testCorrect: 0,
        testTotal: performance.testTotal,
        testAccuracy: performance.testAccuracy,
        testXpEarned: 0,
        practiceAttempts: 0,
        practiceCorrect: 0,
        practiceTotal: performance.practiceTotal,
        practiceAccuracy: 0,
      });

      console.log('✅ FIREBASE: User stats loaded from coaching server');
      setLoading(false);
    } catch (err) {
      console.error('❌ FIREBASE: Error fetching stats:', err);
      setLoading(false);
    }
  }, [user, coachingId]);

  // Update XP and streak ONLY for test completion — now a no-op since atomic handles it
  const updateStatsForTest = useCallback(
    async (xpEarned: number) => {
      if (!user || !coachingId) return;
      // Stats are updated atomically in saveTestResultAtomic
      // Just refresh
      await fetchStats();
      console.log(`✅ FIREBASE: Stats refreshed after test: +${xpEarned} XP`);
    },
    [user, coachingId, fetchStats]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const todayPerformanceLegacy = {
    attempts: todayPerformance.testAttempts + todayPerformance.practiceAttempts,
    totalCorrect: todayPerformance.testCorrect + todayPerformance.practiceCorrect,
    totalQuestions: todayPerformance.testTotal + todayPerformance.practiceTotal,
    accuracy: todayPerformance.testAccuracy,
  };

  return {
    stats,
    todayPerformance: todayPerformanceLegacy,
    todayTestPerformance: {
      attempts: todayPerformance.testAttempts,
      correct: todayPerformance.testCorrect,
      total: todayPerformance.testTotal,
      accuracy: todayPerformance.testAccuracy,
      xpEarned: todayPerformance.testXpEarned,
    },
    todayPracticePerformance: {
      attempts: todayPerformance.practiceAttempts,
      correct: todayPerformance.practiceCorrect,
      total: todayPerformance.practiceTotal,
      accuracy: todayPerformance.practiceAccuracy,
    },
    loading,
    updateStats: updateStatsForTest,
    refetch: fetchStats,
  };
};