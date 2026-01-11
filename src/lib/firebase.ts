import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
export const firebaseAuth = getAuth(app);
export default app;
