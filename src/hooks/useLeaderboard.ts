import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLeaderboard,
  subscribeToLeaderboard,
  LeaderboardEntry as FirebaseLeaderboardEntry,
} from '@/lib/firebaseService';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  full_name: string;
  student_class: string | null;
  board: string | null;
  total_xp: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  tests_taken: number;
  rank?: number;
}

interface LeaderboardData {
  live: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  userLiveRank: number | null;
  userWeeklyRank: number | null;
  userMonthlyRank: number | null;
}

const convertEntry = (entry: FirebaseLeaderboardEntry, index: number): LeaderboardEntry => ({
  id: entry.uid,
  user_id: entry.uid,
  full_name: entry.name,
  student_class: entry.class || null,
  board: entry.board || null,
  total_xp: entry.xp,
  correct_answers: entry.correct,
  wrong_answers: entry.wrong,
  accuracy: entry.accuracy,
  tests_taken: entry.testsTaken,
  rank: index + 1,
});

const getCurrentWeekId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-${weekNum.toString().padStart(2, '0')}`;
};

const getCurrentMonthId = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const useLeaderboard = () => {
  const { user, coachingId, profile } = useAuth();
  const [data, setData] = useState<LeaderboardData>({
    live: [],
    weekly: [],
    monthly: [],
    userLiveRank: null,
    userWeeklyRank: null,
    userMonthlyRank: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!user || !coachingId) {
      setLoading(false);
      setError('No coaching assigned');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📊 FIREBASE: Fetching leaderboard from coaching server: ${coachingId}`);

      const entries = await getLeaderboard(coachingId);
      const converted = entries.map((entry, index) => convertEntry(entry, index));
      const userEntry = converted.find((e) => e.user_id === user.id);

      console.log(`✅ FIREBASE: Loaded ${converted.length} leaderboard entries`);

      setData({
        live: converted,
        weekly: converted,
        monthly: converted,
        userLiveRank: userEntry?.rank || null,
        userWeeklyRank: userEntry?.rank || null,
        userMonthlyRank: userEntry?.rank || null,
      });
    } catch (err: any) {
      console.error('❌ FIREBASE: Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [user, coachingId]);

  // Leaderboard update is now handled atomically inside saveTestResultAtomic
  const updateLeaderboardForTest = useCallback(
    async (
      correctAnswers: number,
      wrongAnswers: number,
      totalQuestions: number
    ): Promise<boolean> => {
      // No-op: leaderboard is updated atomically in saveTestResultAtomic
      // Just trigger a refetch
      await fetchLeaderboard();
      return true;
    },
    [fetchLeaderboard]
  );

  useEffect(() => {
    fetchLeaderboard();

    if (!coachingId) return;

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = subscribeToLeaderboard(coachingId, (entries) => {
      const converted = entries.map((entry, index) => convertEntry(entry, index));
      const userEntry = converted.find((e) => e.user_id === user?.id);

      setData({
        live: converted,
        weekly: converted,
        monthly: converted,
        userLiveRank: userEntry?.rank || null,
        userWeeklyRank: userEntry?.rank || null,
        userMonthlyRank: userEntry?.rank || null,
      });
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [coachingId, fetchLeaderboard, user?.id]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchLeaderboard,
    updateLeaderboardForTest,
    getCurrentWeekId,
    getCurrentMonthId,
  };
};