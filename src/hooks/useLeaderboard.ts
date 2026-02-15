import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLeaderboard,
  subscribeToLeaderboard,
  updateLeaderboardAfterTest,
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

// Convert Firebase entry to component format
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

// Helper functions to get current week/month IDs
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

  // Fetch leaderboard from Firebase
  const fetchLeaderboard = useCallback(async () => {
    if (!user || !coachingId) {
      setLoading(false);
      setError('No coaching assigned');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📊 FIREBASE: Fetching leaderboard for coaching: ${coachingId}`);
      
      const entries = await getLeaderboard(coachingId);
      const converted = entries.map((entry, index) => convertEntry(entry, index));

      // Find user's rank
      const userEntry = converted.find((e) => e.user_id === user.uid);

      console.log(`✅ FIREBASE: Loaded ${converted.length} leaderboard entries`);

      setData({
        live: converted,
        weekly: converted, // Firebase uses single leaderboard, UI shows same data
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

  // Update leaderboard after TEST submission (NOT practice)
  const updateLeaderboardForTest = useCallback(
    async (
      correctAnswers: number,
      wrongAnswers: number,
      totalQuestions: number
    ): Promise<boolean> => {
      if (!user || !coachingId || !profile) {
        console.error('❌ Cannot update leaderboard: Missing user/coaching/profile');
        return false;
      }

      console.log("LEADERBOARD WRITE ATTEMPT", {
        uid: user.uid,
        coachingId,
        path: `leaderboards/${coachingId}/users/${user.uid}`,
      });

      try {
        await updateLeaderboardAfterTest(coachingId, user.uid, correctAnswers, wrongAnswers);
        console.log('✅ FIREBASE: Leaderboard updated successfully');
        return true;
      } catch (err: any) {
        console.error('❌ FIREBASE: Error updating leaderboard:', err);
        return false;
      }
    },
    [user, coachingId, profile]
  );

  // Set up real-time subscription
  useEffect(() => {
    fetchLeaderboard();

    if (!coachingId) return;

    // Subscribe to real-time updates from Firebase
    unsubscribeRef.current = subscribeToLeaderboard(coachingId, (entries) => {
      const converted = entries.map((entry, index) => convertEntry(entry, index));
      const userEntry = converted.find((e) => e.user_id === user?.uid);

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
  }, [coachingId, fetchLeaderboard, user?.uid]);

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
