import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import mcqData from '@/data/mcq-seed.json';

interface MCQQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  chapter: string;
  topic: string;
  marks: number;
}

interface MCQMeta {
  board: string;
  class: string;
  subject: string;
  totalQuestions: number;
  timePerQuestion: number;
  difficulty: string;
  createdFor: string;
  type: 'daily-test' | 'practice';
}

interface MCQData {
  meta: MCQMeta;
  questions: MCQQuestion[];
}

function validateMCQData(data: MCQData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.meta.totalQuestions !== data.questions.length) {
    errors.push(`totalQuestions (${data.meta.totalQuestions}) does not match questions.length (${data.questions.length})`);
  }

  const ids = data.questions.map(q => q.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    errors.push('Question IDs are not unique');
  }

  for (const question of data.questions) {
    const optionKeys = Object.keys(question.options);
    if (!optionKeys.includes(question.correctAnswer)) {
      errors.push(`Question ${question.id}: correctAnswer "${question.correctAnswer}" not found in options`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function generateSetId(meta: MCQMeta): string {
  if (meta.type === 'daily-test') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `daily_${year}_${month}_${day}`;
  }
  return `practice_${Date.now()}`;
}

/**
 * Seed MCQ sets into a specific coaching server.
 * Path: coachings/{coachingId}/mcq_sets/{setId}
 *
 * Falls back to global mcq_sets if no coachingId provided (legacy support).
 */
export async function seedMCQsToFirestore(coachingId?: string): Promise<{ success: boolean; setId?: string; error?: string }> {
  console.log('🔥 FIREBASE: Starting MCQ seed...');

  try {
    const data = mcqData as MCQData;

    const validation = validateMCQData(data);
    if (!validation.valid) {
      console.error('❌ MCQ Validation Errors:', validation.errors);
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    console.log('✅ MCQ data validation passed');
    console.log(`📊 Total questions in JSON: ${data.questions.length}`);

    const setId = generateSetId(data.meta);

    // Determine target path: coaching-scoped or global fallback
    console.log(`📁 Target: ${coachingId ? `coachings/${coachingId}/mcq_sets` : 'mcq_sets'}/${setId}`);

    const docRef = coachingId
      ? doc(db, 'coachings', coachingId, 'mcq_sets', setId)
      : doc(db, 'mcq_sets', setId);

    let existingDoc;
    try {
      existingDoc = await getDoc(docRef);
    } catch (readError: any) {
      if (readError.code === 'permission-denied' || readError.message?.includes('permission')) {
        return { success: false, error: 'FIRESTORE PERMISSION DENIED on MCQ sets.' };
      }
      throw readError;
    }

    if (existingDoc.exists()) {
      console.log(`⚠️ MCQ set "${setId}" already exists. Skipping seed.`);
      return { success: true, setId, error: 'Already exists' };
    }

    const mcqDocument = {
      meta: data.meta,
      questions: data.questions,
      createdAt: serverTimestamp(),
      source: 'system',
      status: 'active',
      ...(coachingId ? { coachingId } : {}),
    };

    try {
      await setDoc(docRef, mcqDocument);
      console.log('✅ MCQ WRITE SUCCESS!');
    } catch (writeError: any) {
      if (writeError.code === 'permission-denied' || writeError.message?.includes('permission')) {
        return { success: false, error: 'FIRESTORE PERMISSION DENIED on MCQ sets write.' };
      }
      throw writeError;
    }

    console.log(`✅ MCQ set seeded: ${setId} → ${collectionPath}`);
    return { success: true, setId };
  } catch (error: any) {
    console.error('❌ FATAL ERROR seeding MCQs:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function runMCQSeeder(coachingId?: string): Promise<void> {
  console.log('🚀 Starting MCQ seeding...');
  const result = await seedMCQsToFirestore(coachingId);

  if (result.success) {
    console.log('✅ Seeding complete!');
    console.log(`📝 Set ID: ${result.setId}`);
  } else {
    console.error('❌ Seeding failed:', result.error);
  }
}
