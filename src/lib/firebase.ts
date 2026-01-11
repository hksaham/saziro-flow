import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, Timestamp, increment, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBlg8zpozVE_21wnoR8zan1w376U6_hm-4",
  authDomain: "studdy-buddy-bd.firebaseapp.com",
  projectId: "studdy-buddy-bd",
  storageBucket: "studdy-buddy-bd.firebasestorage.app",
  messagingSenderId: "966424842562",
  appId: "1:966424842562:web:966d405e4e6487e1eb78db",
  measurementId: "G-033CNHR0ZB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection references
export const mcqSetsCollection = collection(db, 'mcqSets');
export const mcqQuestionsCollection = collection(db, 'mcqQuestions');
export const attemptsCollection = collection(db, 'attempts');
export const userStatsCollection = collection(db, 'userStats');
export const leaderboardCollection = collection(db, 'leaderboard');

// Re-export Firestore utilities
export { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp, 
  increment,
  serverTimestamp 
};
