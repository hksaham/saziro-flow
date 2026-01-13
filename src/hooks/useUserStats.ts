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
    practiceAccuracy: 0
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

      // Fetch today's performance - SEPARATED by mode
      const today = new Date().toISOString().split('T')[0];
      const { data: perfData, error: perfError } = await supabase
        .from('mcq_performance')
        .select('mode, correct_answers, total_questions, xp_earned')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (perfError) {
        console.error('Error fetching performance:', perfError);
      } else if (perfData && perfData.length > 0) {
        // Separate test vs practice performance
        const testPerf = perfData.filter(p => p.mode === 'test');
        const practicePerf = perfData.filter(p => p.mode === 'practice');

        const testCorrect = testPerf.reduce((sum, p) => sum + p.correct_answers, 0);
        const testTotal = testPerf.reduce((sum, p) => sum + p.total_questions, 0);
        const testXp = testPerf.reduce((sum, p) => sum + p.xp_earned, 0);

        const practiceCorrect = practicePerf.reduce((sum, p) => sum + p.correct_answers, 0);
        const practiceTotal = practicePerf.reduce((sum, p) => sum + p.total_questions, 0);

        setTodayPerformance({
          testAttempts: testPerf.length,
          testCorrect,
          testTotal,
          testAccuracy: testTotal > 0 ? Math.round((testCorrect / testTotal) * 100) : 0,
          testXpEarned: testXp,
          practiceAttempts: practicePerf.length,
          practiceCorrect,
          practiceTotal,
          practiceAccuracy: practiceTotal > 0 ? Math.round((practiceCorrect / practiceTotal) * 100) : 0
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Stats fetch error:', err);
      setLoading(false);
    }
  }, [user, coachingId]);

  // Update XP and streak ONLY for test completion
  // STRICT: Practice mode should NEVER call this
  const updateStatsForTest = useCallback(async (xpEarned: number) => {
    if (!user || !stats) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = stats.last_activity_date;
    
    // Calculate streak - ONLY increments on test completion
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
    
    // XP calculation for test: +10 per correct, -5 per wrong
    // xpEarned is already calculated correctly in savePerformance
    const newTotalXp = Math.max(0, stats.total_xp + xpEarned);

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

      console.log(`✅ Test stats updated: +${xpEarned} XP (total: ${newTotalXp}), streak: ${newStreak}`);
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

  // Legacy compatibility - returns combined questions count
  const todayPerformanceLegacy = {
    attempts: todayPerformance.testAttempts + todayPerformance.practiceAttempts,
    totalCorrect: todayPerformance.testCorrect + todayPerformance.practiceCorrect,
    totalQuestions: todayPerformance.testTotal + todayPerformance.practiceTotal,
    accuracy: todayPerformance.testAccuracy // Only test accuracy shown
  };

  return {
    stats,
    todayPerformance: todayPerformanceLegacy,
    todayTestPerformance: {
      attempts: todayPerformance.testAttempts,
      correct: todayPerformance.testCorrect,
      total: todayPerformance.testTotal,
      accuracy: todayPerformance.testAccuracy,
      xpEarned: todayPerformance.testXpEarned
    },
    todayPracticePerformance: {
      attempts: todayPerformance.practiceAttempts,
      correct: todayPerformance.practiceCorrect,
      total: todayPerformance.practiceTotal,
      accuracy: todayPerformance.practiceAccuracy
    },
    loading,
    updateStats: updateStatsForTest, // Only for test mode
    refetch: fetchStats
  };
};
