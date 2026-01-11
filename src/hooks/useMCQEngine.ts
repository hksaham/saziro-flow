import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, firebaseAuth } from '@/lib/firebase';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import type { MCQQuestion, MCQPerformance, MCQState, MCQSet } from '@/types/mcq';

export const useMCQEngine = (
  classId: string = 'class_10',
  subject: string = 'Science',
  chapter: string = 'chapter_1'
) => {
  const [state, setState] = useState<MCQState>({
    questions: [],
    currentIndex: 0,
    selectedOption: null,
    answered: false,
    score: 0,
    totalAnswered: 0,
    loading: true,
    error: null
  });
  const [meta, setMeta] = useState<MCQSet['meta'] | null>(null);
  const [setId, setSetId] = useState<string | null>(null);

  // Fetch MCQs from mcq_sets collection (new structure)
  const fetchMCQsFromSets = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // STEP 1 — AUTH CONTEXT CHECK (Firebase Auth)
    console.log('🔐 FIREBASE AUTH DEBUG (pre-fetch):', {
      currentUser: firebaseAuth.currentUser,
      uid: firebaseAuth.currentUser?.uid ?? null,
      isAnonymous: (firebaseAuth.currentUser as any)?.isAnonymous ?? null,
      providerData: firebaseAuth.currentUser?.providerData ?? null,
    });

    // Ensure we have a Firebase auth context (required for request.auth-based rules)
    if (!firebaseAuth.currentUser) {
      try {
        console.log('🔐 No Firebase auth session found. Signing in anonymously (web, production)...');
        await signInAnonymously(firebaseAuth);
      } catch (authErr: any) {
        console.error('❌ FIREBASE AUTH SIGN-IN FAILED:', {
          message: authErr?.message,
          code: authErr?.code,
        });
      }
    }

    console.log('🔐 FIREBASE AUTH DEBUG (post-auth):', {
      currentUser: firebaseAuth.currentUser,
      uid: firebaseAuth.currentUser?.uid ?? null,
      isAnonymous: (firebaseAuth.currentUser as any)?.isAnonymous ?? null,
      providerData: firebaseAuth.currentUser?.providerData ?? null,
    });

    console.log('🔍 MCQ ENGINE: Starting to fetch MCQs from Firestore...');
    console.log('🔍 Firebase Project: studdy-buddy-bd');
    console.log('🔍 Environment: web, production (not emulator)');

    // STEP 2 — FIRESTORE PATH AUDIT
    const collectionName = 'mcq_sets';
    console.log('📁 Firestore read path:', `${collectionName}`);

    try {
      const setsRef = collection(db, collectionName);
      console.log(`📁 Querying collection: ${collectionName}`);

      let setsSnapshot;
      try {
        setsSnapshot = await getDocs(setsRef);
        console.log(`✅ Read successful. Found ${setsSnapshot.size} documents.`);
        console.log('📄 Document IDs:', setsSnapshot.docs.map(d => d.id));
      } catch (readError: any) {
        console.error('❌ FIRESTORE READ FAILED:', {
          message: readError?.message,
          code: readError?.code,
        });

        if (readError?.code === 'permission-denied' || readError?.message?.includes('permission')) {
          throw new Error('FIRESTORE PERMISSION DENIED: Firestore Security Rules are blocking READs to mcq_sets.');
        }
        throw readError;
      }

      // If no MCQ sets exist, seed the data
      if (setsSnapshot.empty) {
        console.log('⚠️ No MCQ sets found in Firestore. Attempting to seed from JSON...');
        const result = await seedMCQsToFirestore();

        if (!result.success) {
          console.error('❌ Seeding failed:', result.error);
          throw new Error(result.error || 'Failed to seed MCQs');
        }

        console.log(`✅ Seeded MCQ set: ${result.setId}`);

        // Fetch again after seeding
        const newSnapshot = await getDocs(setsRef);
        console.log(`📊 After seeding, found ${newSnapshot.size} documents`);
        console.log('📄 Document IDs (after seed):', newSnapshot.docs.map(d => d.id));

        if (newSnapshot.empty) {
          throw new Error('Failed to fetch seeded MCQs - documents not found after seed');
        }

        const firstDoc = newSnapshot.docs[0];
        const data = firstDoc.data() as MCQSet;

        console.log('🧾 RAW first document:', { id: firstDoc.id, data });

        setSetId(firstDoc.id);
        setMeta(data.meta);

        const { convertToLegacyFormat } = await import('@/types/mcq');
        const questions: MCQQuestion[] = data.questions.map(q => convertToLegacyFormat(q));

        setState(prev => ({
          ...prev,
          questions,
          loading: false
        }));
        return;
      }

      // Get the first active set
      const activeDoc = setsSnapshot.docs.find(d => (d.data() as any)?.status === 'active') || setsSnapshot.docs[0];
      const data = activeDoc.data() as MCQSet;

      console.log('🧾 RAW active document:', { id: activeDoc.id, data });

      setSetId(activeDoc.id);
      setMeta(data.meta);

      const { convertToLegacyFormat } = await import('@/types/mcq');
      const questions: MCQQuestion[] = data.questions.map(q => convertToLegacyFormat(q));

      console.log(`✅ Loaded MCQ set: ${activeDoc.id} with ${questions.length} questions`);

      setState(prev => ({
        ...prev,
        questions,
        loading: false
      }));
    } catch (err: any) {
      console.error('❌ MCQ ENGINE ERROR:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load questions. Please try again.'
      }));
    }
  }, []);

  // Select an option
  const selectOption = useCallback((optionIndex: number) => {
    if (state.answered) return;
    setState(prev => ({ ...prev, selectedOption: optionIndex }));
  }, [state.answered]);

  // Submit answer
  const submitAnswer = useCallback(() => {
    if (state.selectedOption === null || state.answered) return;
    
    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = state.selectedOption === currentQuestion.correctIndex;
    
    setState(prev => ({
      ...prev,
      answered: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      totalAnswered: prev.totalAnswered + 1
    }));
    
    return isCorrect;
  }, [state.selectedOption, state.answered, state.questions, state.currentIndex]);

  // Go to next question
  const nextQuestion = useCallback(() => {
    if (state.currentIndex < state.questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        answered: false
      }));
    }
  }, [state.currentIndex, state.questions.length]);

  // Go to previous question
  const prevQuestion = useCallback(() => {
    if (state.currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        selectedOption: null,
        answered: false
      }));
    }
  }, [state.currentIndex]);

  // Reset quiz
  const resetQuiz = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: 0,
      selectedOption: null,
      answered: false,
      score: 0,
      totalAnswered: 0
    }));
  }, []);

  // Save performance to Firestore
  const savePerformance = useCallback(async () => {
    try {
      const firebaseUid = firebaseAuth.currentUser?.uid;
      if (!firebaseUid) {
        console.error('❌ Cannot save performance: firebaseAuth.currentUser is null');
        return;
      }

      const perfPath = `users/${firebaseUid}/mcqPerformance/${classId}/${subject}/${chapter}`;
      console.log('🧾 Firestore write path (performance):', perfPath);

      const perfRef = doc(db, perfPath);
      const perfSnap = await getDoc(perfRef);

      if (perfSnap.exists()) {
        const existing = perfSnap.data() as MCQPerformance;
        await updateDoc(perfRef, {
          totalAttempted: existing.totalAttempted + state.totalAnswered,
          correct: existing.correct + state.score,
          wrong: existing.wrong + (state.totalAnswered - state.score),
          lastAttemptedAt: serverTimestamp()
        });
      } else {
        await setDoc(perfRef, {
          totalAttempted: state.totalAnswered,
          correct: state.score,
          wrong: state.totalAnswered - state.score,
          lastAttemptedAt: serverTimestamp()
        });
      }

      console.log('✅ Performance saved successfully');
    } catch (err: any) {
      console.error('❌ Error saving performance:', {
        message: err?.message,
        code: err?.code,
      });
    }
  }, [classId, subject, chapter, state.totalAnswered, state.score]);

  // Fetch MCQs on mount
  useEffect(() => {
    fetchMCQsFromSets();
  }, [fetchMCQsFromSets]);

  const currentQuestion = state.questions[state.currentIndex] || null;
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const isFirstQuestion = state.currentIndex === 0;
  const progress = state.questions.length > 0 
    ? ((state.currentIndex + 1) / state.questions.length) * 100 
    : 0;

  return {
    ...state,
    currentQuestion,
    isLastQuestion,
    isFirstQuestion,
    progress,
    meta,
    setId,
    selectOption,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    resetQuiz,
    savePerformance,
    refetch: fetchMCQsFromSets
  };
};
