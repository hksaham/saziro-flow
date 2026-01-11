import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { seedMCQsToFirestore } from '@/lib/mcqSeeder';
import type { MCQQuestion, MCQPerformance, MCQState, MCQSet, convertToLegacyFormat } from '@/types/mcq';

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
    
    console.log('🔍 MCQ ENGINE: Starting to fetch MCQs from Firestore...');
    console.log('🔍 Collection: mcq_sets');
    console.log('🔍 Firebase Project: studdy-buddy-bd');
    
    try {
      // First, check mcq_sets collection for active sets
      const setsRef = collection(db, 'mcq_sets');
      console.log('📁 Querying collection: mcq_sets');
      
      let setsSnapshot;
      try {
        setsSnapshot = await getDocs(setsRef);
        console.log(`✅ Read successful. Found ${setsSnapshot.size} documents.`);
      } catch (readError: any) {
        console.error('❌ FIRESTORE READ FAILED:', readError.message);
        console.error('❌ Error code:', readError.code);
        
        if (readError.code === 'permission-denied' || readError.message?.includes('permission')) {
          throw new Error('FIRESTORE PERMISSION DENIED: Your Firestore Security Rules are blocking reads. Please update rules in Firebase Console.');
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
        
        if (newSnapshot.empty) {
          throw new Error('Failed to fetch seeded MCQs - documents not found after seed');
        }
        
        // Get the first active set
        const firstDoc = newSnapshot.docs[0];
        const data = firstDoc.data() as MCQSet;
        
        console.log(`📄 Loaded document: ${firstDoc.id}`);
        console.log(`📊 Questions count: ${data.questions?.length || 0}`);
        
        setSetId(firstDoc.id);
        setMeta(data.meta);
        
        // Convert questions to legacy format for UI compatibility
        const { convertToLegacyFormat } = await import('@/types/mcq');
        const questions: MCQQuestion[] = data.questions.map(q => convertToLegacyFormat(q));
        
        setState(prev => ({
          ...prev,
          questions,
          loading: false
        }));
        return;
      }
      
      // Get the first active set (could filter by class/subject later)
      const activeDoc = setsSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.status === 'active';
      }) || setsSnapshot.docs[0];
      
      const data = activeDoc.data() as MCQSet;
      
      console.log(`📄 Using document: ${activeDoc.id}`);
      console.log(`📊 Document data:`, {
        meta: data.meta,
        questionsCount: data.questions?.length || 0,
        status: data.status
      });
      
      setSetId(activeDoc.id);
      setMeta(data.meta);
      
      // Convert questions to legacy format for UI compatibility
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
      console.error('❌ Error message:', err.message);
      
      let errorMessage = 'Failed to load questions. Please try again.';
      if (err.message?.includes('PERMISSION')) {
        errorMessage = 'Firestore permission denied. Please update your Firebase Security Rules to allow access to mcq_sets collection.';
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
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
  const savePerformance = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const perfPath = `users/${userId}/mcqPerformance/${classId}/${subject}/${chapter}`;
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
      
      console.log('Performance saved successfully');
    } catch (err) {
      console.error('Error saving performance:', err);
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
