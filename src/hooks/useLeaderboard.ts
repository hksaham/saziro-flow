import { useState, useEffect, useCallback, useRef } from 'react';
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
  live: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  userLiveRank: number | null;
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
    live: [],
    weekly: [],
    monthly: [],
    userLiveRank: null,
    userWeeklyRank: null,
    userMonthlyRank: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch LIVE leaderboard with real-time subscription
  const fetchLiveLeaderboard = useCallback(async () => {
    if (!user || !coachingId) return [];

    const { data: liveData, error: liveError } = await supabase
      .from('live_leaderboard')
      .select('*')
      .eq('coaching_id', coachingId)
      .order('total_xp', { ascending: false })
      .order('accuracy', { ascending: false })
      .order('last_test_at', { ascending: true });

    if (liveError) {
      console.error('Live leaderboard error:', liveError);
      throw liveError;
    }

    return (liveData || []).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }, [user, coachingId]);

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

      // Fetch all leaderboards in parallel
      const [liveResult, weeklyResult, monthlyResult] = await Promise.all([
        fetchLiveLeaderboard(),
        supabase
          .from('weekly_leaderboard')
          .select('*')
          .eq('coaching_id', coachingId)
          .eq('week_id', weekId)
          .order('total_xp', { ascending: false })
          .order('accuracy', { ascending: false })
          .order('updated_at', { ascending: true }),
        supabase
          .from('monthly_leaderboard')
          .select('*')
          .eq('coaching_id', coachingId)
          .eq('month_id', monthId)
          .order('total_xp', { ascending: false })
          .order('accuracy', { ascending: false })
          .order('updated_at', { ascending: true })
      ]);

      if (weeklyResult.error) throw weeklyResult.error;
      if (monthlyResult.error) throw monthlyResult.error;

      // Add ranks
      const rankedWeekly = (weeklyResult.data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      const rankedMonthly = (monthlyResult.data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      // Find user's ranks
      const userLiveEntry = liveResult.find(e => e.user_id === user.id);
      const userWeeklyEntry = rankedWeekly.find(e => e.user_id === user.id);
      const userMonthlyEntry = rankedMonthly.find(e => e.user_id === user.id);

      console.log(`✅ Live: ${liveResult.length}, Weekly: ${rankedWeekly.length}, Monthly: ${rankedMonthly.length}`);

      setData({
        live: liveResult,
        weekly: rankedWeekly,
        monthly: rankedMonthly,
        userLiveRank: userLiveEntry?.rank || null,
        userWeeklyRank: userWeeklyEntry?.rank || null,
        userMonthlyRank: userMonthlyEntry?.rank || null
      });
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [user, coachingId, fetchLiveLeaderboard]);

  // Update LIVE leaderboard after TEST submission (NOT practice)
  // IMPORTANT: Only UPDATE existing entries - entries are created at approval time
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

    console.log(`📊 Updating leaderboard: +${correctAnswers * 10} - ${wrongAnswers * 5} = ${xpChange} XP`);

    try {
      // Update LIVE leaderboard (entry MUST exist - created at approval time)
      const { data: existingLive } = await supabase
        .from('live_leaderboard')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLive) {
        const newTotalXp = existingLive.total_xp + xpChange;
        const newCorrect = existingLive.correct_answers + correctAnswers;
        const newWrong = existingLive.wrong_answers + wrongAnswers;
        const newTestsTaken = existingLive.tests_taken + 1;
        const newAccuracy = (newCorrect + newWrong) > 0 
          ? Number(((newCorrect / (newCorrect + newWrong)) * 100).toFixed(2))
          : 0;

        await supabase
          .from('live_leaderboard')
          .update({
            total_xp: Math.max(0, newTotalXp),
            correct_answers: newCorrect,
            wrong_answers: newWrong,
            accuracy: newAccuracy,
            tests_taken: newTestsTaken,
            last_test_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLive.id);
      } else {
        // Entry doesn't exist - this shouldn't happen, but log warning
        console.warn('⚠️ LIVE leaderboard entry not found for user - should have been created at approval');
      }

      // Update weekly leaderboard (creates per-week entries as needed)
      const { data: existingWeekly } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .eq('coaching_id', coachingId)
        .eq('user_id', user.id)
        .eq('week_id', weekId)
        .maybeSingle();

      if (existingWeekly) {
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
            total_xp: Math.max(0, newTotalXp),
            correct_answers: newCorrect,
            wrong_answers: newWrong,
            accuracy: newAccuracy,
            tests_taken: newTestsTaken,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingWeekly.id);
      } else {
        // Weekly entries are per-week, so we can create them
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
            accuracy: totalQuestions > 0 
              ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
              : 0,
            tests_taken: 1
          });
      }

      // Update monthly leaderboard (creates per-month entries as needed)
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
        // Monthly entries are per-month, so we can create them
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
            accuracy: totalQuestions > 0 
              ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
              : 0,
            tests_taken: 1
          });
      }

      console.log('✅ All leaderboards updated successfully');
      return true;
    } catch (err: any) {
      console.error('❌ Error updating leaderboard:', err);
      return false;
    }
  }, [user, coachingId, profile]);

  // Set up real-time subscription for LIVE leaderboard
  useEffect(() => {
    fetchLeaderboard();

    if (!coachingId) return;

    // Subscribe to LIVE leaderboard changes with filter for coaching_id
    const channel = supabase
      .channel(`live_leaderboard_${coachingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_leaderboard',
          filter: `coaching_id=eq.${coachingId}`
        },
        async (payload) => {
          console.log('🔴 LIVE leaderboard update received:', payload.eventType);
          // Refetch to get properly sorted data
          const liveData = await fetchLiveLeaderboard();
          const userLiveEntry = liveData.find(e => e.user_id === user?.id);
          
          setData(prev => ({
            ...prev,
            live: liveData,
            userLiveRank: userLiveEntry?.rank || null
          }));
        }
      )
      .subscribe((status) => {
        console.log('📡 Live leaderboard subscription:', status);
      });

    channelRef.current = channel;

    // Also subscribe to weekly/monthly for periodic updates
    const weeklyChannel = supabase
      .channel('weekly_leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_leaderboard',
          filter: `coaching_id=eq.${coachingId}`
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    const monthlyChannel = supabase
      .channel('monthly_leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_leaderboard',
          filter: `coaching_id=eq.${coachingId}`
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      supabase.removeChannel(weeklyChannel);
      supabase.removeChannel(monthlyChannel);
    };
  }, [coachingId, fetchLeaderboard, fetchLiveLeaderboard, user?.id]);

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
