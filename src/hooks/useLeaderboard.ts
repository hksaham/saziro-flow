import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  userWeeklyRank: number | null;
  userMonthlyRank: number | null;
}

// Helper functions to get current week/month IDs
const getCurrentWeekId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  
  // Calculate ISO week number
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
    weekly: [],
    monthly: [],
    userWeeklyRank: null,
    userMonthlyRank: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!user || !coachingId) {
      setLoading(false);
      setError('No coaching assigned');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weekId = getCurrentWeekId();
      const monthId = getCurrentMonthId();

      console.log(`📊 Fetching leaderboard for coaching: ${coachingId}`);
      console.log(`📅 Week ID: ${weekId}, Month ID: ${monthId}`);

      // Fetch weekly leaderboard - sorted by XP DESC, accuracy DESC, updated_at ASC
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('week_id', weekId)
        .order('total_xp', { ascending: false })
        .order('accuracy', { ascending: false })
        .order('updated_at', { ascending: true });

      if (weeklyError) {
        console.error('Weekly leaderboard error:', weeklyError);
        throw weeklyError;
      }

      // Fetch monthly leaderboard
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('monthly_leaderboard')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('month_id', monthId)
        .order('total_xp', { ascending: false })
        .order('accuracy', { ascending: false })
        .order('updated_at', { ascending: true });

      if (monthlyError) {
        console.error('Monthly leaderboard error:', monthlyError);
        throw monthlyError;
      }

      // Add ranks
      const rankedWeekly = (weeklyData || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      const rankedMonthly = (monthlyData || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      // Find user's ranks
      const userWeeklyEntry = rankedWeekly.find(e => e.user_id === user.id);
      const userMonthlyEntry = rankedMonthly.find(e => e.user_id === user.id);

      console.log(`✅ Weekly entries: ${rankedWeekly.length}, Monthly entries: ${rankedMonthly.length}`);

      setData({
        weekly: rankedWeekly,
        monthly: rankedMonthly,
        userWeeklyRank: userWeeklyEntry?.rank || null,
        userMonthlyRank: userMonthlyEntry?.rank || null
      });
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [user, coachingId]);

  // Update leaderboard after TEST submission (NOT practice)
  const updateLeaderboardForTest = useCallback(async (
    correctAnswers: number,
    wrongAnswers: number,
    totalQuestions: number
  ): Promise<boolean> => {
    if (!user || !coachingId || !profile) {
      console.error('❌ Cannot update leaderboard: Missing user/coaching/profile');
      return false;
    }

    const weekId = getCurrentWeekId();
    const monthId = getCurrentMonthId();
    
    // Calculate XP: +10 per correct, -5 per wrong
    const xpChange = (correctAnswers * 10) - (wrongAnswers * 5);
    const accuracy = totalQuestions > 0 
      ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
      : 0;

    console.log(`📊 Updating leaderboard: +${correctAnswers * 10} - ${wrongAnswers * 5} = ${xpChange} XP`);

    try {
      // Update weekly leaderboard
      const { data: existingWeekly } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('user_id', user.id)
        .eq('week_id', weekId)
        .maybeSingle();

      if (existingWeekly) {
        // Update existing entry
        const newTotalXp = existingWeekly.total_xp + xpChange;
        const newCorrect = existingWeekly.correct_answers + correctAnswers;
        const newWrong = existingWeekly.wrong_answers + wrongAnswers;
        const newTestsTaken = existingWeekly.tests_taken + 1;
        const newAccuracy = (newCorrect + newWrong) > 0 
          ? Number(((newCorrect / (newCorrect + newWrong)) * 100).toFixed(2))
          : 0;

        await supabase
          .from('weekly_leaderboard')
          .update({
            total_xp: Math.max(0, newTotalXp), // Don't go negative
            correct_answers: newCorrect,
            wrong_answers: newWrong,
            accuracy: newAccuracy,
            tests_taken: newTestsTaken,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingWeekly.id);
      } else {
        // Insert new entry
        await supabase
          .from('weekly_leaderboard')
          .insert({
            coaching_id: coachingId,
            user_id: user.id,
            week_id: weekId,
            full_name: profile.full_name,
            student_class: profile.student_class,
            board: profile.board,
            total_xp: Math.max(0, xpChange),
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            accuracy,
            tests_taken: 1
          });
      }

      // Update monthly leaderboard
      const { data: existingMonthly } = await supabase
        .from('monthly_leaderboard')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('user_id', user.id)
        .eq('month_id', monthId)
        .maybeSingle();

      if (existingMonthly) {
        const newTotalXp = existingMonthly.total_xp + xpChange;
        const newCorrect = existingMonthly.correct_answers + correctAnswers;
        const newWrong = existingMonthly.wrong_answers + wrongAnswers;
        const newTestsTaken = existingMonthly.tests_taken + 1;
        const newAccuracy = (newCorrect + newWrong) > 0 
          ? Number(((newCorrect / (newCorrect + newWrong)) * 100).toFixed(2))
          : 0;

        await supabase
          .from('monthly_leaderboard')
          .update({
            total_xp: Math.max(0, newTotalXp),
            correct_answers: newCorrect,
            wrong_answers: newWrong,
            accuracy: newAccuracy,
            tests_taken: newTestsTaken,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMonthly.id);
      } else {
        await supabase
          .from('monthly_leaderboard')
          .insert({
            coaching_id: coachingId,
            user_id: user.id,
            month_id: monthId,
            full_name: profile.full_name,
            student_class: profile.student_class,
            board: profile.board,
            total_xp: Math.max(0, xpChange),
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            accuracy,
            tests_taken: 1
          });
      }

      console.log('✅ Leaderboard updated successfully');
      return true;
    } catch (err: any) {
      console.error('❌ Error updating leaderboard:', err);
      return false;
    }
  }, [user, coachingId, profile]);

  // Set up realtime subscription
  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to changes in leaderboard tables
    const weeklyChannel = supabase
      .channel('weekly_leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_leaderboard'
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    const monthlyChannel = supabase
      .channel('monthly_leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_leaderboard'
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(weeklyChannel);
      supabase.removeChannel(monthlyChannel);
    };
  }, [fetchLeaderboard]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchLeaderboard,
    updateLeaderboardForTest,
    getCurrentWeekId,
    getCurrentMonthId
  };
};
