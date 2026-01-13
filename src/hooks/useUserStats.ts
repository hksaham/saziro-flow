import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserStats {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface TodayPerformance {
  attempts: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
}

export const useUserStats = () => {
  const { user, coachingId } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [todayPerformance, setTodayPerformance] = useState<TodayPerformance>({
    attempts: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    accuracy: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch user stats
  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch or create user stats
      let { data: statsData, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
        return;
      }

      // If no stats exist, create initial stats
      if (!statsData) {
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            coaching_id: coachingId,
            total_xp: 0,
            current_streak: 0,
            longest_streak: 0
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating stats:', insertError);
        } else {
          statsData = newStats;
        }
      }

      setStats(statsData);

      // Fetch today's performance
      const today = new Date().toISOString().split('T')[0];
      const { data: perfData, error: perfError } = await supabase
        .from('mcq_performance')
        .select('correct_answers, total_questions')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (perfError) {
        console.error('Error fetching performance:', perfError);
      } else if (perfData && perfData.length > 0) {
        const totalCorrect = perfData.reduce((sum, p) => sum + p.correct_answers, 0);
        const totalQuestions = perfData.reduce((sum, p) => sum + p.total_questions, 0);
        setTodayPerformance({
          attempts: perfData.length,
          totalCorrect,
          totalQuestions,
          accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Stats fetch error:', err);
      setLoading(false);
    }
  }, [user, coachingId]);

  // Update XP and streak after MCQ completion
  const updateStats = useCallback(async (xpEarned: number) => {
    if (!user || !stats) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = stats.last_activity_date;
    
    // Calculate streak
    let newStreak = stats.current_streak;
    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActivity === yesterdayStr) {
        // Consecutive day - increment streak
        newStreak = stats.current_streak + 1;
      } else if (lastActivity === null || lastActivity < yesterdayStr) {
        // Streak broken - reset to 1
        newStreak = 1;
      }
    }

    const newLongestStreak = Math.max(stats.longest_streak, newStreak);
    const newTotalXp = stats.total_xp + xpEarned;

    try {
      const { error } = await supabase
        .from('user_stats')
        .update({
          total_xp: newTotalXp,
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_activity_date: today
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating stats:', error);
        return;
      }

      // Update local state
      setStats(prev => prev ? {
        ...prev,
        total_xp: newTotalXp,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today
      } : null);

      console.log(`✅ Stats updated: +${xpEarned} XP, streak: ${newStreak}`);
    } catch (err) {
      console.error('Stats update error:', err);
    }
  }, [user, stats]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 Stats updated in realtime:', payload);
          if (payload.new) {
            setStats(payload.new as UserStats);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mcq_performance',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch today's performance on new MCQ completion
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchStats]);

  return {
    stats,
    todayPerformance,
    loading,
    updateStats,
    refetch: fetchStats
  };
};
