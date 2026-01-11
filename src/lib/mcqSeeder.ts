import { db } from './firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

// Validation functions
function validateMCQData(data: MCQData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check totalQuestions matches questions.length
  if (data.meta.totalQuestions !== data.questions.length) {
    errors.push(`totalQuestions (${data.meta.totalQuestions}) does not match questions.length (${data.questions.length})`);
  }
  
  // Check unique question IDs
  const ids = data.questions.map(q => q.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    errors.push('Question IDs are not unique');
  }
  
  // Check correctAnswer exists in options
  for (const question of data.questions) {
    const optionKeys = Object.keys(question.options);
    if (!optionKeys.includes(question.correctAnswer)) {
      errors.push(`Question ${question.id}: correctAnswer "${question.correctAnswer}" not found in options`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Generate setId based on type
function generateSetId(meta: MCQMeta): string {
  if (meta.type === 'daily-test') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `daily_${year}_${month}_${day}`;
  }
  // For practice, return a unique ID based on timestamp
  return `practice_${Date.now()}`;
}

export async function seedMCQsToFirestore(): Promise<{ success: boolean; setId?: string; error?: string }> {
  console.log('🔥 FIREBASE DEBUG - Starting MCQ seed...');
  console.log('🔥 FIREBASE PROJECT ID: studdy-buddy-bd');
  console.log('🔥 FIREBASE CONFIG:', {
    projectId: 'studdy-buddy-bd',
    authDomain: 'studdy-buddy-bd.firebaseapp.com',
    environment: 'PRODUCTION (not emulator)'
  });
  
  try {
    const data = mcqData as MCQData;
    
    // Validate data
    const validation = validateMCQData(data);
    if (!validation.valid) {
      console.error('❌ MCQ Validation Errors:', validation.errors);
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      };
    }
    
    console.log('✅ MCQ data validation passed');
    console.log(`📊 Total questions in JSON: ${data.questions.length}`);
    
    // Generate setId
    const setId = generateSetId(data.meta);
    console.log(`📋 Generated setId: ${setId}`);
    console.log(`📁 Target collection: mcq_sets`);
    console.log(`📄 Target document: mcq_sets/${setId}`);
    
    // Check if already exists
    console.log('🔍 Checking if document already exists...');
    const docRef = doc(db, 'mcq_sets', setId);
    
    let existingDoc;
    try {
      existingDoc = await getDoc(docRef);
      console.log('✅ Read permission check passed');
    } catch (readError: any) {
      console.error('❌ FIRESTORE READ ERROR:', readError.message);
      console.error('❌ ERROR CODE:', readError.code);
      if (readError.code === 'permission-denied' || readError.message?.includes('permission')) {
        return { 
          success: false, 
          error: 'FIRESTORE PERMISSION DENIED: Please update your Firestore Security Rules to allow read/write to mcq_sets collection. Go to Firebase Console → Firestore → Rules → Allow read/write for mcq_sets.' 
        };
      }
      throw readError;
    }
    
    if (existingDoc.exists()) {
      console.log(`⚠️ MCQ set "${setId}" already exists. Skipping seed.`);
      return { success: true, setId, error: 'Already exists' };
    }
    
    // Prepare document
    const mcqDocument = {
      meta: data.meta,
      questions: data.questions,
      createdAt: serverTimestamp(),
      source: 'system',
      status: 'active'
    };
    
    console.log('📝 Attempting to write document to Firestore...');
    console.log('📝 Document structure:', {
      meta: data.meta,
      questionsCount: data.questions.length,
      source: 'system',
      status: 'active'
    });
    
    // Write to Firestore
    try {
      await setDoc(docRef, mcqDocument);
      console.log('✅ WRITE SUCCESS!');
    } catch (writeError: any) {
      console.error('❌ FIRESTORE WRITE ERROR:', writeError.message);
      console.error('❌ ERROR CODE:', writeError.code);
      if (writeError.code === 'permission-denied' || writeError.message?.includes('permission')) {
        return { 
          success: false, 
          error: 'FIRESTORE PERMISSION DENIED: Your Firestore Security Rules are blocking writes. Go to Firebase Console → Firestore Database → Rules and add: match /mcq_sets/{doc} { allow read, write: if true; }' 
        };
      }
      throw writeError;
    }
    
    console.log(`✅ MCQ set seeded successfully!`);
    console.log(`📋 setId: ${setId}`);
    console.log(`📊 Total questions: ${data.questions.length}`);
    console.log(`🔗 Firestore Console Path: https://console.firebase.google.com/project/studdy-buddy-bd/firestore/data/mcq_sets/${setId}`);
    
    return { success: true, setId };
    
  } catch (error: any) {
    console.error('❌ FATAL ERROR seeding MCQs:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Function to run seeding (can be called from console or a component)
export async function runMCQSeeder(): Promise<void> {
  console.log('🚀 Starting MCQ seeding...');
  const result = await seedMCQsToFirestore();
  
  if (result.success) {
    console.log('✅ Seeding complete!');
    console.log(`📝 Set ID: ${result.setId}`);
  } else {
    console.error('❌ Seeding failed:', result.error);
  }
}
