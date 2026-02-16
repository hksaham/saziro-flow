import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================
// TYPES
// ============================================

export interface FirebaseUser {
  uid: string;
  role: 'student' | 'teacher';
  name: string;
  email: string;
  phone?: string;
  class?: string;
  board?: string;
  tone?: string;
  coachingId: string | null;
  status: 'pending' | 'active' | 'rejected';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Coaching {
  coachingId: string;
  name: string;
  teacherUid: string;
  inviteToken: string;
  createdAt: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  class?: string;
  board?: string;
  xp: number;
  testsTaken: number;
  correct: number;
  wrong: number;
  accuracy: number;
  joinedAt: Timestamp;
  lastTestAt?: Timestamp;
}

export interface MCQResult {
  setId: string;
  coachingId: string;
  correct: number;
  wrong: number;
  score: number;
  timeTakenSeconds: number;
  submittedAt: Timestamp;
}

export interface MistakeEntry {
  questionId: string;
  questionText: string;
  options: string[];
  selected: string;
  correct: string;
  subject?: string;
  source: 'test' | 'practice';
  createdAt: Timestamp;
}

export interface UserStats {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

// ============================================
// USER OPERATIONS
// ============================================

export const createUser = async (
  uid: string,
  data: {
    role: 'student' | 'teacher';
    name: string;
    email: string;
    coachingId: string | null;
    status?: 'pending' | 'active';
  }
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    role: data.role,
    name: data.name,
    email: data.email,
    coachingId: data.coachingId,
    status: data.status || (data.role === 'student' ? 'pending' : 'active'),
    createdAt: serverTimestamp(),
  });
  console.log('✅ FIREBASE: Created user', uid);
};

export const getUser = async (uid: string): Promise<FirebaseUser | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as FirebaseUser;
  }
  return null;
};

export const updateUser = async (
  uid: string,
  data: Partial<FirebaseUser>
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  console.log('✅ FIREBASE: Updated user', uid);
};

export const getPendingStudents = async (
  coachingId: string
): Promise<FirebaseUser[]> => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('coachingId', '==', coachingId),
    where('role', '==', 'student'),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as FirebaseUser);
};

export const approveStudent = async (
  uid: string,
  coachingId: string,
  userData: { name: string; class?: string; board?: string }
): Promise<void> => {
  const batch = writeBatch(db);

  // Update user status
  const userRef = doc(db, 'users', uid);
  batch.update(userRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });

  // Create leaderboard entry
  const leaderboardRef = doc(db, 'leaderboards', coachingId, 'users', uid);
  batch.set(leaderboardRef, {
    uid,
    name: userData.name,
    class: userData.class || null,
    board: userData.board || null,
    xp: 0,
    testsTaken: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    joinedAt: serverTimestamp(),
    lastTestAt: null,
  });

  // Create user stats
  const statsRef = doc(db, 'userStats', uid);
  batch.set(statsRef, {
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  });

  await batch.commit();
  console.log('✅ FIREBASE: Approved student and created leaderboard entry', uid);
};

export const rejectStudent = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
  console.log('✅ FIREBASE: Rejected student', uid);
};

// ============================================
// COACHING OPERATIONS
// ============================================

export const createCoaching = async (
  teacherUid: string,
  name: string
): Promise<string> => {
  const coachingRef = doc(collection(db, 'coachings'));
  const inviteToken = generateInviteToken();
  
  await setDoc(coachingRef, {
    coachingId: coachingRef.id,
    name,
    teacherUid,
    inviteToken,
    createdAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Created coaching', coachingRef.id);
  return coachingRef.id;
};

export const getCoaching = async (coachingId: string): Promise<Coaching | null> => {
  const coachingRef = doc(db, 'coachings', coachingId);
  const coachingSnap = await getDoc(coachingRef);
  if (coachingSnap.exists()) {
    return coachingSnap.data() as Coaching;
  }
  return null;
};

export const getCoachingByInviteToken = async (
  token: string
): Promise<Coaching | null> => {
  const coachingsRef = collection(db, 'coachings');
  const q = query(coachingsRef, where('inviteToken', '==', token), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].data() as Coaching;
  }
  return null;
};

const generateInviteToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

export const getLeaderboard = async (
  coachingId: string
): Promise<LeaderboardEntry[]> => {
  console.log("LEADERBOARD READ", {
    coachingId,
    queryPath: `leaderboards/${coachingId}/users`,
  });

  const leaderboardRef = collection(db, 'leaderboards', coachingId, 'users');
  const q = query(
    leaderboardRef,
    orderBy('xp', 'desc'),
    orderBy('accuracy', 'desc'),
    orderBy('joinedAt', 'asc')
  );
  const snapshot = await getDocs(q);

  console.log("LEADERBOARD SNAPSHOT SIZE", snapshot.size);

  return snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
};

export const subscribeToLeaderboard = (
  coachingId: string,
  callback: (entries: LeaderboardEntry[]) => void
): (() => void) => {
  const leaderboardRef = collection(db, 'leaderboards', coachingId, 'users');
  const q = query(
    leaderboardRef,
    orderBy('xp', 'desc'),
    orderBy('accuracy', 'desc'),
    orderBy('joinedAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('🔴 FIREBASE LEADERBOARD REALTIME UPDATE:', snapshot.size, 'entries');
    const entries = snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
    callback(entries);
  });
};

export const updateLeaderboardAfterTest = async (
  coachingId: string,
  uid: string,
  correctAnswers: number,
  wrongAnswers: number
): Promise<void> => {
  const leaderboardRef = doc(db, 'leaderboards', coachingId, 'users', uid);
  const leaderboardSnap = await getDoc(leaderboardRef);

  if (!leaderboardSnap.exists()) {
    console.warn('⚠️ FIREBASE: Leaderboard entry not found for user', uid);
    return;
  }

  const current = leaderboardSnap.data() as LeaderboardEntry;
  const xpChange = (correctAnswers * 10) - (wrongAnswers * 5);
  const newXp = Math.max(0, current.xp + xpChange);
  const newCorrect = current.correct + correctAnswers;
  const newWrong = current.wrong + wrongAnswers;
  const newTestsTaken = current.testsTaken + 1;
  const newAccuracy = (newCorrect + newWrong) > 0
    ? Number(((newCorrect / (newCorrect + newWrong)) * 100).toFixed(2))
    : 0;

  await updateDoc(leaderboardRef, {
    xp: newXp,
    correct: newCorrect,
    wrong: newWrong,
    testsTaken: newTestsTaken,
    accuracy: newAccuracy,
    lastTestAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Updated leaderboard for user', uid, `+${xpChange} XP`);
};

// ============================================
// USER STATS OPERATIONS
// ============================================

export const getUserStats = async (uid: string): Promise<UserStats | null> => {
  const statsRef = doc(db, 'userStats', uid);
  const statsSnap = await getDoc(statsRef);
  if (statsSnap.exists()) {
    return statsSnap.data() as UserStats;
  }
  return null;
};

export const updateUserStatsAfterTest = async (
  uid: string,
  xpEarned: number
): Promise<void> => {
  const statsRef = doc(db, 'userStats', uid);
  const statsSnap = await getDoc(statsRef);
  const today = new Date().toISOString().split('T')[0];

  if (!statsSnap.exists()) {
    // Create new stats
    await setDoc(statsRef, {
      totalXp: Math.max(0, xpEarned),
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
    });
  } else {
    const current = statsSnap.data() as UserStats;
    const lastDate = current.lastActivityDate;
    
    let newStreak = current.currentStreak;
    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const daysDiff = Math.floor(
        (todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === 1) {
        newStreak = current.currentStreak + 1;
      } else if (daysDiff > 1) {
        newStreak = 1; // Reset streak
      }
      // If daysDiff === 0, keep same streak (already did test today)
    } else {
      newStreak = 1;
    }

    await updateDoc(statsRef, {
      totalXp: Math.max(0, current.totalXp + xpEarned),
      currentStreak: newStreak,
      longestStreak: Math.max(current.longestStreak, newStreak),
      lastActivityDate: today,
    });
  }

  console.log('✅ FIREBASE: Updated user stats', uid);
};

// ============================================
// MCQ RESULTS OPERATIONS
// ============================================

export const saveTestResult = async (
  uid: string,
  result: {
    setId: string;
    coachingId: string;
    correct: number;
    wrong: number;
    score: number;
    timeTakenSeconds: number;
  }
): Promise<string> => {
  const testId = `${result.setId}_${Date.now()}`;
  const resultRef = doc(db, 'results', uid, 'tests', testId);
  
  await setDoc(resultRef, {
    ...result,
    submittedAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Saved test result', testId);
  return testId;
};

export const savePracticeResult = async (
  uid: string,
  result: {
    setId: string;
    correct: number;
    wrong: number;
    score: number;
  }
): Promise<void> => {
  const practiceRef = doc(db, 'results', uid, 'practice', result.setId);
  
  await setDoc(practiceRef, {
    ...result,
    submittedAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Saved practice result', result.setId);
};

export const getTodayTestResult = async (
  uid: string,
  coachingId: string
): Promise<MCQResult | null> => {
  const today = new Date().toISOString().split('T')[0];
  const testsRef = collection(db, 'results', uid, 'tests');
  const snapshot = await getDocs(testsRef);
  
  for (const doc of snapshot.docs) {
    const data = doc.data() as MCQResult;
    if (data.coachingId === coachingId) {
      const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
      if (submittedDate === today) {
        return data;
      }
    }
  }
  return null;
};

export const getTodayPracticeCount = async (uid: string): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const practiceRef = collection(db, 'results', uid, 'practice');
  const snapshot = await getDocs(practiceRef);
  
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
    if (submittedDate === today) {
      count++;
    }
  }
  return count;
};

// ============================================
// MISTAKE NOTEBOOK OPERATIONS
// ============================================

export const saveMistakes = async (
  uid: string,
  mistakes: Array<{
    questionId: string;
    questionText: string;
    options: string[];
    selected: string;
    correct: string;
    subject?: string;
    source: 'test' | 'practice';
  }>
): Promise<void> => {
  const batch = writeBatch(db);

  for (const mistake of mistakes) {
    const mistakeRef = doc(collection(db, 'mistakes', uid, 'items'));
    batch.set(mistakeRef, {
      ...mistake,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  console.log('✅ FIREBASE: Saved', mistakes.length, 'mistakes');
};

export const getMistakes = async (
  uid: string,
  limitCount: number = 50
): Promise<MistakeEntry[]> => {
  const mistakesRef = collection(db, 'mistakes', uid, 'items');
  const q = query(mistakesRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MistakeEntry & { id: string });
};

export const deleteMistake = async (uid: string, mistakeId: string): Promise<void> => {
  const mistakeRef = doc(db, 'mistakes', uid, 'items', mistakeId);
  await deleteDoc(mistakeRef);
  console.log('✅ FIREBASE: Deleted mistake', mistakeId);
};

// ============================================
// DAILY TEST OPERATIONS
// ============================================

export const getOrCreateDailyTest = async (
  coachingId: string,
  questions: any[]
): Promise<{ setId: string; questionIds: string[] }> => {
  const today = new Date().toISOString().split('T')[0];
  const setId = `${coachingId}_${today}`;
  
  const testRef = doc(db, 'mcq_sets', setId);
  const testSnap = await getDoc(testRef);

  if (testSnap.exists()) {
    const data = testSnap.data();
    console.log('📋 FIREBASE: Found existing daily test', setId);
    return { setId, questionIds: data.questionIds || [] };
  }

  // Create new daily test
  const questionIds = questions.slice(0, 30).map((_, idx) => `q_${idx}`);
  await setDoc(testRef, {
    type: 'test',
    coachingId,
    date: today,
    questionIds,
    createdAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Created daily test', setId);
  return { setId, questionIds };
};

// ============================================
// PERFORMANCE DASHBOARD
// ============================================

export const getTodayPerformance = async (
  uid: string
): Promise<{ testTotal: number; testAccuracy: number; practiceTotal: number }> => {
  const today = new Date().toISOString().split('T')[0];
  
  // Get test results
  const testsRef = collection(db, 'results', uid, 'tests');
  const testSnapshot = await getDocs(testsRef);
  
  let testTotal = 0;
  let testCorrect = 0;
  
  for (const doc of testSnapshot.docs) {
    const data = doc.data();
    const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
    if (submittedDate === today) {
      testTotal += (data.correct || 0) + (data.wrong || 0);
      testCorrect += data.correct || 0;
    }
  }

  // Get practice results
  const practiceRef = collection(db, 'results', uid, 'practice');
  const practiceSnapshot = await getDocs(practiceRef);
  
  let practiceTotal = 0;
  
  for (const doc of practiceSnapshot.docs) {
    const data = doc.data();
    const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
    if (submittedDate === today) {
      practiceTotal += (data.correct || 0) + (data.wrong || 0);
    }
  }

  return {
    testTotal,
    testAccuracy: testTotal > 0 ? Math.round((testCorrect / testTotal) * 100) : 0,
    practiceTotal,
  };
};
