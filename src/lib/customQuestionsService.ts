// ============================================
// CUSTOM QUESTIONS SERVICE
// Path: coachings/{coachingId}/custom_questions/{questionId}
// Path: coachings/{coachingId}/coaching_settings/config
// ============================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { MCQQuestion } from '@/types/mcq';

// ---- Types ----

export interface CustomQuestion {
  id: string;
  question: string;
  options: string[];       // exactly 4 strings
  correctIndex: number;    // 0–3
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: any;
  createdBy: string;       // teacher uid
}

export interface CoachingSettings {
  useGlobalQuestions: boolean;   // true = mix in global 900 questions as fallback
  updatedAt: any;
  updatedBy: string;
}

// ---- Settings ----

export const getCoachingSettings = async (
  coachingId: string
): Promise<CoachingSettings> => {
  const ref = doc(db, 'coachings', coachingId, 'coaching_settings', 'config');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as CoachingSettings;
  }
  // Default: global questions are ON
  return { useGlobalQuestions: true, updatedAt: null, updatedBy: '' };
};

export const updateCoachingSettings = async (
  coachingId: string,
  teacherUid: string,
  settings: Partial<CoachingSettings>
): Promise<void> => {
  const ref = doc(db, 'coachings', coachingId, 'coaching_settings', 'config');
  await setDoc(ref, {
    ...settings,
    updatedAt: serverTimestamp(),
    updatedBy: teacherUid,
  }, { merge: true });
  console.log('✅ FIREBASE: Updated coaching settings', coachingId);
};

// ---- Custom Questions CRUD ----

export const getCustomQuestions = async (
  coachingId: string
): Promise<CustomQuestion[]> => {
  const ref = collection(db, 'coachings', coachingId, 'custom_questions');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as CustomQuestion);
};

export const saveCustomQuestions = async (
  coachingId: string,
  teacherUid: string,
  questions: Omit<CustomQuestion, 'id' | 'createdAt' | 'createdBy'>[]
): Promise<void> => {
  const batch = writeBatch(db);
  for (const q of questions) {
    const ref = doc(collection(db, 'coachings', coachingId, 'custom_questions'));
    batch.set(ref, {
      ...q,
      createdBy: teacherUid,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`✅ FIREBASE: Saved ${questions.length} custom questions to coaching ${coachingId}`);
};

export const deleteCustomQuestion = async (
  coachingId: string,
  questionId: string
): Promise<void> => {
  const ref = doc(db, 'coachings', coachingId, 'custom_questions', questionId);
  await deleteDoc(ref);
  console.log('✅ FIREBASE: Deleted custom question', questionId);
};

export const deleteAllCustomQuestions = async (
  coachingId: string
): Promise<void> => {
  const ref = collection(db, 'coachings', coachingId, 'custom_questions');
  const snap = await getDocs(ref);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log('✅ FIREBASE: Deleted all custom questions for coaching', coachingId);
};

// ---- Question resolver used by useDailyTest ----
// Returns the final question pool for a coaching:
//   - If custom questions exist → use them
//   - If useGlobalQuestions is true AND no custom questions → fall back to global
//   - If useGlobalQuestions is false AND no custom questions → return empty (teacher has
//     turned off global but not uploaded anything yet)

export const resolveQuestionPool = async (
  coachingId: string
): Promise<{ questions: MCQQuestion[]; source: 'custom' | 'global' | 'empty' }> => {
  const [customQuestions, settings] = await Promise.all([
    getCustomQuestions(coachingId),
    getCoachingSettings(coachingId),
  ]);

  if (customQuestions.length > 0) {
    console.log(`📋 QUESTION POOL: Using ${customQuestions.length} custom questions for coaching ${coachingId}`);
    return {
      questions: customQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
      source: 'custom',
    };
  }

  if (settings.useGlobalQuestions) {
    console.log('📋 QUESTION POOL: No custom questions, falling back to global SAZIRO Flow questions');
    return { questions: [], source: 'global' };
  }

  console.log('⚠️ QUESTION POOL: Global questions disabled and no custom questions uploaded');
  return { questions: [], source: 'empty' };
};