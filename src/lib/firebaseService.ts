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
  collectionGroup,
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
  activeCoachingId: string | null;
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

export interface CoachingMember {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  membershipStatus: 'pending' | 'approved' | 'rejected';
  class?: string;
  board?: string;
  joinedAt: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  class?: string;
  board?: string;
  xp: number;
  streak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  testsTaken: number;
  correct: number;
  wrong: number;
  accuracy: number;
  joinedAt: Timestamp;
  lastTestAt?: Timestamp;
}

export interface MCQResult {
  uid: string;
  setId: string;
  mode: 'test' | 'practice';
  correct: number;
  wrong: number;
  score: number;
  timeTakenSeconds: number;
  submittedAt: Timestamp;
}

export interface MistakeEntry {
  uid: string;
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

// Legacy compat type for CoachingSwitcher/ManageCoachings
export interface CoachingMembership {
  coachingId: string;
  joinedAt: Timestamp;
  roleInCoaching: string;
  membershipStatus: 'pending' | 'approved' | 'rejected';
}

// ============================================
// USER OPERATIONS (Global — users exist outside coachings)
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
  const batch = writeBatch(db);

  // Create global user profile
  const userRef = doc(db, 'users', uid);
  batch.set(userRef, {
    uid,
    role: data.role,
    name: data.name,
    email: data.email,
    activeCoachingId: data.role === 'teacher' ? data.coachingId : null,
    status: data.status || (data.role === 'student' ? 'pending' : 'active'),
    createdAt: serverTimestamp(),
  });

  // Create membership inside coaching server
  if (data.coachingId) {
    const memberRef = doc(db, 'coachings', data.coachingId, 'members', uid);
    batch.set(memberRef, {
      uid,
      name: data.name,
      email: data.email,
      role: data.role,
      membershipStatus: data.role === 'student' ? 'pending' : 'approved',
      joinedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  console.log('✅ FIREBASE: Created user with server-style membership', uid);
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
  await setDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log('✅ FIREBASE: Updated user', uid);
};

// ============================================
// MEMBERSHIP OPERATIONS (Server-scoped)
// Path: coachings/{coachingId}/members/{uid}
// ============================================

export const getPendingStudents = async (
  coachingId: string
): Promise<FirebaseUser[]> => {
  const membersRef = collection(db, 'coachings', coachingId, 'members');
  const q = query(membersRef, where('membershipStatus', '==', 'pending'));
  const snapshot = await getDocs(q);

  // Fetch full user data for each pending member
  const pendingUsers: FirebaseUser[] = [];
  for (const memberDoc of snapshot.docs) {
    const uid = memberDoc.id;
    const userData = await getUser(uid);
    if (userData) {
      pendingUsers.push(userData);
    }
  }
  return pendingUsers;
};

export const approveStudent = async (
  uid: string,
  coachingId: string,
  userData: { name: string; class?: string; board?: string }
): Promise<void> => {
  const batch = writeBatch(db);

  // Update user root status
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const existingUser = userSnap.data() as FirebaseUser | undefined;
  const updateData: Record<string, any> = {
    status: 'active',
    updatedAt: serverTimestamp(),
  };
  if (!existingUser?.activeCoachingId) {
    updateData.activeCoachingId = coachingId;
  }
  batch.update(userRef, updateData);

  // Update membership in coaching server
  const memberRef = doc(db, 'coachings', coachingId, 'members', uid);
  batch.set(memberRef, {
    uid,
    name: userData.name,
    email: existingUser?.email || '',
    role: 'student',
    class: userData.class || null,
    board: userData.board || null,
    membershipStatus: 'approved',
    joinedAt: serverTimestamp(),
  }, { merge: true });

  // Create leaderboard entry inside coaching server
  const leaderboardRef = doc(db, 'coachings', coachingId, 'leaderboard', uid);
  batch.set(leaderboardRef, {
    uid,
    name: userData.name,
    class: userData.class || null,
    board: userData.board || null,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    testsTaken: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    joinedAt: serverTimestamp(),
    lastTestAt: null,
  });

  await batch.commit();
  console.log('✅ FIREBASE: Approved student with server-scoped leaderboard', uid);
};

export const rejectStudent = async (uid: string, coachingId?: string): Promise<void> => {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);
  batch.update(userRef, {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });

  if (coachingId) {
    const memberRef = doc(db, 'coachings', coachingId, 'members', uid);
    batch.set(memberRef, {
      membershipStatus: 'rejected',
    }, { merge: true });
  }

  await batch.commit();
  console.log('✅ FIREBASE: Rejected student', uid);
};

// ============================================
// COACHING OPERATIONS
// Path: coachings/{coachingId}
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
// LEADERBOARD OPERATIONS (Server-scoped)
// Path: coachings/{coachingId}/leaderboard/{uid}
// ============================================

export const getLeaderboard = async (
  coachingId: string
): Promise<LeaderboardEntry[]> => {
  console.log('LEADERBOARD READ', {
    coachingId,
    queryPath: `coachings/${coachingId}/leaderboard`,
  });

  const leaderboardRef = collection(db, 'coachings', coachingId, 'leaderboard');
  const q = query(
    leaderboardRef,
    orderBy('xp', 'desc'),
    orderBy('accuracy', 'desc'),
    orderBy('joinedAt', 'asc')
  );
  const snapshot = await getDocs(q);

  console.log('LEADERBOARD SNAPSHOT SIZE', snapshot.size);

  return snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
};

export const subscribeToLeaderboard = (
  coachingId: string,
  callback: (entries: LeaderboardEntry[]) => void
): (() => void) => {
  const leaderboardRef = collection(db, 'coachings', coachingId, 'leaderboard');
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

// ============================================
// USER STATS OPERATIONS (Server-scoped)
// Stats are now stored in coachings/{coachingId}/leaderboard/{uid}
// No separate userStats collection needed
// ============================================

export const getUserStats = async (uid: string, coachingId: string): Promise<UserStats | null> => {
  if (!coachingId) return null;
  const lbRef = doc(db, 'coachings', coachingId, 'leaderboard', uid);
  const lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    const data = lbSnap.data() as LeaderboardEntry;
    return {
      totalXp: data.xp,
      currentStreak: data.streak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      lastActivityDate: data.lastActivityDate ?? null,
    };
  }
  return null;
};

export const updateUserStatsAfterTest = async (
  uid: string,
  coachingId: string,
  xpEarned: number
): Promise<void> => {
  // Stats are updated atomically in saveTestResultAtomic
  // This function is kept for compatibility but delegates to the leaderboard entry
  console.log('✅ FIREBASE: Stats update handled by atomic test save');
};

// ============================================
// MCQ RESULTS OPERATIONS (Server-scoped)
// Path: coachings/{coachingId}/results/{resultId}
// ============================================

export const saveTestResult = async (
  uid: string,
  coachingId: string,
  result: {
    setId: string;
    correct: number;
    wrong: number;
    score: number;
    timeTakenSeconds: number;
  }
): Promise<string> => {
  const testId = `${uid}_${result.setId}_${Date.now()}`;
  const resultRef = doc(db, 'coachings', coachingId, 'results', testId);

  await setDoc(resultRef, {
    uid,
    mode: 'test',
    ...result,
    submittedAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Saved test result to coaching server', testId);
  return testId;
};

export const savePracticeResult = async (
  uid: string,
  coachingId: string,
  result: {
    setId: string;
    correct: number;
    wrong: number;
    score: number;
  }
): Promise<void> => {
  const practiceId = `${uid}_${result.setId}_${Date.now()}`;
  const resultRef = doc(db, 'coachings', coachingId, 'results', practiceId);

  await setDoc(resultRef, {
    uid,
    mode: 'practice',
    ...result,
    submittedAt: serverTimestamp(),
  });

  console.log('✅ FIREBASE: Saved practice result to coaching server');
};

export const getTodayTestResult = async (
  uid: string,
  coachingId: string
): Promise<MCQResult | null> => {
  const today = new Date().toISOString().split('T')[0];
  const resultsRef = collection(db, 'coachings', coachingId, 'results');
  const q = query(resultsRef, where('uid', '==', uid), where('mode', '==', 'test'));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as MCQResult;
    const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
    if (submittedDate === today) {
      return data;
    }
  }
  return null;
};

export const getTodayPracticeCount = async (uid: string, coachingId: string): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const resultsRef = collection(db, 'coachings', coachingId, 'results');
  const q = query(resultsRef, where('uid', '==', uid), where('mode', '==', 'practice'));
  const snapshot = await getDocs(q);

  let count = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
    if (submittedDate === today) {
      count++;
    }
  }
  return count;
};

// ============================================
// MISTAKE NOTEBOOK OPERATIONS (Server-scoped)
// Path: coachings/{coachingId}/mistakes/{id}
// ============================================

export const saveMistakes = async (
  uid: string,
  coachingId: string,
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
    const mistakeRef = doc(collection(db, 'coachings', coachingId, 'mistakes'));
    batch.set(mistakeRef, {
      uid,
      ...mistake,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  console.log('✅ FIREBASE: Saved', mistakes.length, 'mistakes to coaching server');
};

export const getMistakes = async (
  uid: string,
  coachingId: string,
  limitCount: number = 50
): Promise<(MistakeEntry & { id: string })[]> => {
  const mistakesRef = collection(db, 'coachings', coachingId, 'mistakes');
  const q = query(
    mistakesRef,
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MistakeEntry & { id: string });
};

export const deleteMistake = async (coachingId: string, mistakeId: string): Promise<void> => {
  const mistakeRef = doc(db, 'coachings', coachingId, 'mistakes', mistakeId);
  await deleteDoc(mistakeRef);
  console.log('✅ FIREBASE: Deleted mistake', mistakeId);
};

// ============================================
// ATOMIC TEST SUBMISSION (Server-scoped batch write)
// ============================================

export const saveTestResultAtomic = async (
  uid: string,
  coachingId: string,
  result: {
    setId: string;
    correct: number;
    wrong: number;
    score: number;
    timeTakenSeconds: number;
  }
): Promise<{ xpEarned: number }> => {
  const batch = writeBatch(db);
  const xpChange = (result.correct * 10) - (result.wrong * 5);
  const safeXp = Math.max(0, xpChange);
  const today = new Date().toISOString().split('T')[0];

  // 1. Save test result inside coaching server
  const testId = `${uid}_${result.setId}_${Date.now()}`;
  const resultRef = doc(db, 'coachings', coachingId, 'results', testId);
  batch.set(resultRef, {
    uid,
    mode: 'test',
    ...result,
    submittedAt: serverTimestamp(),
  });

  // 2. Update leaderboard (XP + streak + accuracy) inside coaching server
  const leaderboardRef = doc(db, 'coachings', coachingId, 'leaderboard', uid);
  const lbSnap = await getDoc(leaderboardRef);

  if (lbSnap.exists()) {
    const current = lbSnap.data() as LeaderboardEntry;
    const newCorrect = current.correct + result.correct;
    const newWrong = current.wrong + result.wrong;
    const newAccuracy = (newCorrect + newWrong) > 0
      ? Number(((newCorrect / (newCorrect + newWrong)) * 100).toFixed(2))
      : 0;

    // Streak calculation (per coaching)
    const lastDate = current.lastActivityDate;
    let newStreak = current.streak ?? 0;
    if (lastDate) {
      const daysDiff = Math.floor(
        (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) newStreak = (current.streak ?? 0) + 1;
      else if (daysDiff > 1) newStreak = 1;
      // daysDiff === 0: keep same streak
    } else {
      newStreak = 1;
    }

    batch.update(leaderboardRef, {
      xp: Math.max(0, current.xp + xpChange),
      correct: newCorrect,
      wrong: newWrong,
      testsTaken: current.testsTaken + 1,
      accuracy: newAccuracy,
      streak: newStreak,
      longestStreak: Math.max(current.longestStreak ?? 0, newStreak),
      lastActivityDate: today,
      lastTestAt: serverTimestamp(),
    });
  }

  await batch.commit();
  console.log('✅ FIREBASE ATOMIC: Test result + leaderboard saved in coaching server for', uid);
  return { xpEarned: safeXp };
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
// PERFORMANCE DASHBOARD (Server-scoped)
// ============================================

export const getTodayPerformance = async (
  uid: string,
  coachingId: string
): Promise<{ testTotal: number; testAccuracy: number; practiceTotal: number }> => {
  if (!coachingId) {
    return { testTotal: 0, testAccuracy: 0, practiceTotal: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const resultsRef = collection(db, 'coachings', coachingId, 'results');
  const q = query(resultsRef, where('uid', '==', uid));
  const snapshot = await getDocs(q);

  let testTotal = 0;
  let testCorrect = 0;
  let practiceTotal = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const submittedDate = data.submittedAt?.toDate?.()?.toISOString().split('T')[0];
    if (submittedDate === today) {
      if (data.mode === 'test') {
        testTotal += (data.correct || 0) + (data.wrong || 0);
        testCorrect += data.correct || 0;
      } else if (data.mode === 'practice') {
        practiceTotal += (data.correct || 0) + (data.wrong || 0);
      }
    }
  }

  return {
    testTotal,
    testAccuracy: testTotal > 0 ? Math.round((testCorrect / testTotal) * 100) : 0,
    practiceTotal,
  };
};

// ============================================
// MULTI-COACHING OPERATIONS (Server-scoped)
// ============================================

/**
 * Get all coaching memberships for a user.
 * Reads from users/{uid}/coachings subcollection first (legacy path),
 * then verifies each membership in the coaching server.
 */
export const getUserCoachings = async (uid: string): Promise<CoachingMembership[]> => {
  console.log('🔥 FIREBASE: Fetching coachings for user', uid);

  // Step 1: Read from users/{uid}/coachings (legacy subcollection)
  const userCoachingsRef = collection(db, 'users', uid, 'coachings');
  const snapshot = await getDocs(userCoachingsRef);

  console.log('📋 FIREBASE: Found', snapshot.size, 'coaching memberships in user subcollection');

  const memberships: CoachingMembership[] = [];

  for (const d of snapshot.docs) {
    const data = d.data();
    const coachingId = data.coachingId || d.id;

    // Also check the server-style membership for the latest status
    let membershipStatus = data.membershipStatus || 'pending';
    try {
      const serverMemberRef = doc(db, 'coachings', coachingId, 'members', uid);
      const serverSnap = await getDoc(serverMemberRef);
      if (serverSnap.exists()) {
        membershipStatus = serverSnap.data()?.membershipStatus || membershipStatus;
      }
    } catch (e) {
      // Fall back to the subcollection status
    }

    console.log('  → Coaching', coachingId, 'status:', membershipStatus);

    memberships.push({
      coachingId,
      joinedAt: data.joinedAt,
      roleInCoaching: data.role || 'student',
      membershipStatus,
    } as CoachingMembership);
  }

  return memberships;
};

/**
 * Add a coaching membership for a user (creates member in coaching server)
 */
export const addUserCoaching = async (
  uid: string,
  coachingId: string,
  role: string = 'student'
): Promise<{ alreadyExists: boolean; status?: string }> => {
  const memberRef = doc(db, 'coachings', coachingId, 'members', uid);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) {
    const userData = await getUser(uid);
    await setDoc(memberRef, {
      uid,
      name: userData?.name || '',
      email: userData?.email || '',
      role,
      membershipStatus: role === 'student' ? 'pending' : 'approved',
      joinedAt: serverTimestamp(),
    });
    console.log('✅ FIREBASE: Added member to coaching server (pending)', coachingId, 'for user', uid);
    return { alreadyExists: false };
  } else {
    const data = snap.data();
    console.log('ℹ️ FIREBASE: Membership already exists in coaching server', coachingId, 'for user', uid);
    return { alreadyExists: true, status: data?.membershipStatus };
  }
};

/**
 * Switch active coaching for a user (verifies membership in coaching server)
 */
export const switchActiveCoaching = async (
  uid: string,
  coachingId: string
): Promise<{ success: boolean; error?: string }> => {
  // Verify membership exists in coaching server
  const memberRef = doc(db, 'coachings', coachingId, 'members', uid);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    console.error('❌ FIREBASE: User is not a member of coaching server', coachingId);
    return { success: false, error: 'Not a member of this coaching' };
  }

  const memberData = memberSnap.data();
  if (memberData?.membershipStatus !== 'approved') {
    console.error('❌ FIREBASE: Membership not approved in coaching server', coachingId);
    return { success: false, error: 'Membership not yet approved' };
  }

  // Update activeCoachingId on global user
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    activeCoachingId: coachingId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  console.log('✅ FIREBASE: Switched active coaching to', coachingId, 'for user', uid);
  return { success: true };
};

/**
 * Migrate existing user from old structure to server-style architecture.
 * Moves data from users/{uid}/coachings/{coachingId} to coachings/{coachingId}/members/{uid}
 * and from leaderboards/{coachingId}/users/{uid} to coachings/{coachingId}/leaderboard/{uid}
 */
export const migrateUserCoachings = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const userData = userSnap.data() as any;

  // Migrate from old subcollection structure: users/{uid}/coachings/{coachingId}
  try {
    const oldCoachingsRef = collection(db, 'users', uid, 'coachings');
    const oldSnapshot = await getDocs(oldCoachingsRef);

    for (const oldDoc of oldSnapshot.docs) {
      const oldData = oldDoc.data();
      const coachingId = oldData.coachingId || oldDoc.id;

      // Check if already migrated to server model
      const newMemberRef = doc(db, 'coachings', coachingId, 'members', uid);
      const newMemberSnap = await getDoc(newMemberRef);

      if (!newMemberSnap.exists()) {
        console.log('🔄 FIREBASE: Migrating membership to coaching server', uid, coachingId);
        await setDoc(newMemberRef, {
          uid,
          name: userData.name || '',
          email: userData.email || '',
          role: oldData.roleInCoaching || userData.role || 'student',
          membershipStatus: oldData.membershipStatus || 'approved',
          joinedAt: oldData.joinedAt || serverTimestamp(),
        });
      }

      // Migrate leaderboard from old path: leaderboards/{coachingId}/users/{uid}
      const oldLbRef = doc(db, 'leaderboards', coachingId, 'users', uid);
      const oldLbSnap = await getDoc(oldLbRef);
      if (oldLbSnap.exists()) {
        const newLbRef = doc(db, 'coachings', coachingId, 'leaderboard', uid);
        const newLbSnap = await getDoc(newLbRef);
        if (!newLbSnap.exists()) {
          console.log('🔄 FIREBASE: Migrating leaderboard to coaching server', uid, coachingId);
          const lbData = oldLbSnap.data();
          await setDoc(newLbRef, {
            ...lbData,
            streak: 0,
            longestStreak: 0,
            lastActivityDate: null,
          });
        }
      }
    }

    // Migrate old userStats to first coaching's leaderboard
    const oldStatsRef = doc(db, 'userStats', uid);
    const oldStatsSnap = await getDoc(oldStatsRef);
    if (oldStatsSnap.exists() && userData.activeCoachingId) {
      const lbRef = doc(db, 'coachings', userData.activeCoachingId, 'leaderboard', uid);
      const lbSnap = await getDoc(lbRef);
      if (lbSnap.exists()) {
        const statsData = oldStatsSnap.data();
        const lbData = lbSnap.data();
        // Only migrate if streak/xp not already set
        if (!lbData.streak && !lbData.lastActivityDate) {
          await setDoc(lbRef, {
            streak: statsData.currentStreak || 0,
            longestStreak: statsData.longestStreak || 0,
            lastActivityDate: statsData.lastActivityDate || null,
          }, { merge: true });
          console.log('✅ FIREBASE: Migrated userStats to coaching leaderboard', uid);
        }
      }
    }

    // Set activeCoachingId if not already set
    if (!userData.activeCoachingId && oldSnapshot.docs.length > 0) {
      const firstApproved = oldSnapshot.docs.find(d => d.data().membershipStatus === 'approved');
      if (firstApproved) {
        const cid = firstApproved.data().coachingId || firstApproved.id;
        await setDoc(userRef, {
          activeCoachingId: cid,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log('✅ FIREBASE: Set activeCoachingId during migration', uid);
      }
    }
  } catch (err) {
    console.warn('⚠️ FIREBASE: Migration encountered error (non-blocking):', err);
  }

  console.log('✅ FIREBASE: Migration check complete for', uid);
};
