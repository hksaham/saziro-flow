import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  db, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  collection,
  Timestamp,
  serverTimestamp
} from '@/lib/firebase';
import { MCQSet, MCQQuestion, MCQAttempt, MCQAnswer, MCQEngineState } from '@/types/mcq';
import { useAuth } from '@/contexts/AuthContext';

const TIME_PER_QUESTION = 50; // seconds
const XP_CORRECT = 10;
const XP_WRONG = -5;

export const useMCQEngine = (setId: string | null, type: 'daily' | 'practice') => {
  const navigate = useNavigate();
  const { user, coachingId, profile } = useAuth();
  
  const [state, setState] = useState<MCQEngineState>({
    currentSet: null,
    currentAttempt: null,
    currentQuestion: null,
    currentQuestionIndex: 0,
    timeRemaining: TIME_PER_QUESTION,
    isLoading: true,
    error: null,
  });

  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  // Generate daily set ID based on coaching + date
  const getDailySetId = useCallback(() => {
    if (!coachingId) return null;
    const today = new Date().toISOString().split('T')[0];
    return `daily_${coachingId}_${today}`;
  }, [coachingId]);

  // Check if user already attempted this set
  const checkExistingAttempt = useCallback(async (attemptSetId: string): Promise<MCQAttempt | null> => {
    if (!user?.id) return null;
    
    const attemptId = `${attemptSetId}_${user.id}`;
    const attemptRef = doc(db, 'attempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);
    
    if (attemptSnap.exists()) {
      return attemptSnap.data() as MCQAttempt;
    }
    return null;
  }, [user?.id]);

  // Load MCQ set and questions
  const loadMCQSet = useCallback(async () => {
    if (!coachingId || !user?.id) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const targetSetId = type === 'daily' ? getDailySetId() : setId;
      
      if (!targetSetId) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Invalid set ID' }));
        return;
      }

      // Check for existing attempt
      const existingAttempt = await checkExistingAttempt(targetSetId);
      
      if (existingAttempt?.status === 'completed') {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'already_completed',
          currentAttempt: existingAttempt
        }));
        return;
      }

      // Load the set
      const setRef = doc(db, 'mcqSets', targetSetId);
      const setSnap = await getDoc(setRef);
      
      if (!setSnap.exists()) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Set not found' }));
        return;
      }

      const mcqSet = { id: setSnap.id, ...setSnap.data() } as MCQSet;
      
      // Verify coaching access
      if (mcqSet.coachingId !== coachingId) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Access denied' }));
        return;
      }

      // Load questions
      const loadedQuestions: MCQQuestion[] = [];
      for (const qId of mcqSet.questionIds) {
        const qRef = doc(db, 'mcqQuestions', qId);
        const qSnap = await getDoc(qRef);
        if (qSnap.exists()) {
          loadedQuestions.push({ id: qSnap.id, ...qSnap.data() } as MCQQuestion);
        }
      }
      
      setQuestions(loadedQuestions);

      // Resume or create attempt
      let attempt = existingAttempt;
      
      if (!attempt) {
        const attemptId = `${targetSetId}_${user.id}`;
        attempt = {
          id: attemptId,
          setId: targetSetId,
          userId: user.id,
          coachingId,
          type,
          status: 'in_progress',
          currentQuestionIndex: 0,
          answers: [],
          totalCorrect: 0,
          totalWrong: 0,
          xpGained: 0,
          xpLost: 0,
          netXP: 0,
          startedAt: new Date(),
          lastActivityAt: new Date(),
        };
        
        await setDoc(doc(db, 'attempts', attemptId), {
          ...attempt,
          startedAt: serverTimestamp(),
          lastActivityAt: serverTimestamp(),
        });
      }

      const currentIdx = attempt.currentQuestionIndex;
      
      setState({
        currentSet: mcqSet,
        currentAttempt: attempt,
        currentQuestion: loadedQuestions[currentIdx] || null,
        currentQuestionIndex: currentIdx,
        timeRemaining: TIME_PER_QUESTION,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error loading MCQ set:', err);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load questions' 
      }));
    }
  }, [coachingId, user?.id, type, setId, getDailySetId, checkExistingAttempt]);

  // Submit answer (or timeout)
  const submitAnswer = useCallback(async (selectedOptionId: string | null, isTimeout: boolean = false) => {
    if (isSubmittingRef.current || !state.currentAttempt || !state.currentQuestion) return;
    
    isSubmittingRef.current = true;
    
    try {
      const isCorrect = selectedOptionId === state.currentQuestion.correctOptionId;
      const xpChange = isCorrect ? XP_CORRECT : XP_WRONG;
      
      const answer: MCQAnswer = {
        questionId: state.currentQuestion.id,
        questionIndex: state.currentQuestionIndex,
        selectedOptionId,
        isCorrect,
        isTimeout,
        answeredAt: new Date(),
        timeTaken: TIME_PER_QUESTION - state.timeRemaining,
      };

      const updatedAnswers = [...state.currentAttempt.answers, answer];
      const newCorrect = state.currentAttempt.totalCorrect + (isCorrect ? 1 : 0);
      const newWrong = state.currentAttempt.totalWrong + (isCorrect ? 0 : 1);
      const newXPGained = state.currentAttempt.xpGained + (isCorrect ? XP_CORRECT : 0);
      const newXPLost = state.currentAttempt.xpLost + (isCorrect ? 0 : Math.abs(XP_WRONG));
      const newNetXP = Math.max(0, newXPGained - newXPLost);
      const nextIndex = state.currentQuestionIndex + 1;
      const isCompleted = nextIndex >= questions.length;

      // Update attempt in Firestore
      const attemptRef = doc(db, 'attempts', state.currentAttempt.id);
      await updateDoc(attemptRef, {
        answers: updatedAnswers.map(a => ({
          ...a,
          answeredAt: Timestamp.fromDate(a.answeredAt as Date),
        })),
        currentQuestionIndex: nextIndex,
        totalCorrect: newCorrect,
        totalWrong: newWrong,
        xpGained: newXPGained,
        xpLost: newXPLost,
        netXP: newNetXP,
        status: isCompleted ? 'completed' : 'in_progress',
        completedAt: isCompleted ? serverTimestamp() : null,
        lastActivityAt: serverTimestamp(),
      });

      // Update user stats if completed
      if (isCompleted) {
        await updateUserStats(newNetXP);
        
        setState(prev => ({
          ...prev,
          currentAttempt: {
            ...prev.currentAttempt!,
            answers: updatedAnswers,
            totalCorrect: newCorrect,
            totalWrong: newWrong,
            xpGained: newXPGained,
            xpLost: newXPLost,
            netXP: newNetXP,
            status: 'completed',
            completedAt: new Date(),
          },
        }));
        
        // Navigate to results
        navigate(`/mcq/result/${state.currentAttempt.id}`);
      } else {
        // Move to next question
        setState(prev => ({
          ...prev,
          currentQuestionIndex: nextIndex,
          currentQuestion: questions[nextIndex],
          timeRemaining: TIME_PER_QUESTION,
          currentAttempt: {
            ...prev.currentAttempt!,
            answers: updatedAnswers,
            totalCorrect: newCorrect,
            totalWrong: newWrong,
            xpGained: newXPGained,
            xpLost: newXPLost,
            netXP: newNetXP,
            currentQuestionIndex: nextIndex,
          },
        }));
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [state, questions, navigate]);

  // Update user stats
  const updateUserStats = async (xpToAdd: number) => {
    if (!user?.id || !coachingId) return;
    
    try {
      const statsRef = doc(db, 'userStats', user.id);
      const statsSnap = await getDoc(statsRef);
      const today = new Date().toISOString().split('T')[0];
      
      if (statsSnap.exists()) {
        const stats = statsSnap.data();
        const lastDate = stats.lastActivityDate;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const newStreak = lastDate === yesterday ? stats.currentStreak + 1 : 
                         lastDate === today ? stats.currentStreak : 1;
        
        await updateDoc(statsRef, {
          totalXP: Math.max(0, (stats.totalXP || 0) + xpToAdd),
          currentStreak: newStreak,
          lastActivityDate: today,
          totalMCQsAttempted: (stats.totalMCQsAttempted || 0) + questions.length,
          [`${type}TestsCompleted`]: (stats[`${type}TestsCompleted`] || 0) + 1,
        });
      } else {
        await setDoc(statsRef, {
          userId: user.id,
          userName: profile?.full_name || 'Student',
          coachingId,
          totalXP: Math.max(0, xpToAdd),
          currentStreak: 1,
          lastActivityDate: today,
          totalMCQsAttempted: questions.length,
          totalCorrect: state.currentAttempt?.totalCorrect || 0,
          totalWrong: state.currentAttempt?.totalWrong || 0,
          dailyTestsCompleted: type === 'daily' ? 1 : 0,
          practiceTestsCompleted: type === 'practice' ? 1 : 0,
        });
      }

      // Update leaderboard
      await updateDoc(doc(db, 'leaderboard', `${coachingId}_${user.id}`), {
        userId: user.id,
        userName: profile?.full_name || 'Student',
        coachingId,
        totalXP: Math.max(0, (statsSnap.data()?.totalXP || 0) + xpToAdd),
        streak: statsSnap.data()?.currentStreak || 1,
        updatedAt: serverTimestamp(),
      }).catch(async () => {
        // If doesn't exist, create it
        await setDoc(doc(db, 'leaderboard', `${coachingId}_${user.id}`), {
          userId: user.id,
          userName: profile?.full_name || 'Student',
          coachingId,
          totalXP: Math.max(0, xpToAdd),
          streak: 1,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error('Error updating user stats:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (state.isLoading || state.error || !state.currentQuestion) return;
    
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          // Time's up - auto submit
          submitAnswer(null, true);
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isLoading, state.error, state.currentQuestion?.id, submitAnswer]);

  // Anti-cheat: visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.currentAttempt?.status === 'in_progress') {
        submitAnswer(null, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.currentAttempt?.status, submitAnswer]);

  // Anti-cheat: beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.currentAttempt?.status === 'in_progress') {
        e.preventDefault();
        e.returnValue = '';
        submitAnswer(null, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.currentAttempt?.status, submitAnswer]);

  // Disable back button
  useEffect(() => {
    if (state.currentAttempt?.status === 'in_progress') {
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };
      
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [state.currentAttempt?.status]);

  return {
    ...state,
    questions,
    totalQuestions: questions.length,
    loadMCQSet,
    submitAnswer,
    getDailySetId,
  };
};
