import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import {
  getUser,
  createUser,
  updateUser,
  getCoachingByInviteToken,
  FirebaseUser,
} from '@/lib/firebaseService';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  coaching_id: string | null;
  student_class: string | null;
  board: string | null;
  tone: string | null;
  xp: number;
  streak: number;
}

interface AuthContextType {
  user: FirebaseAuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isOnboarded: boolean;
  coachingId: string | null;
  signUp: (email: string, password: string, fullName: string, inviteToken: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const firebaseUserToProfile = (fbUser: FirebaseUser): Profile => ({
  id: fbUser.uid,
  user_id: fbUser.uid,
  full_name: fbUser.name,
  coaching_id: fbUser.coachingId,
  student_class: fbUser.class || null,
  board: fbUser.board || null,
  tone: fbUser.tone || null,
  xp: fbUser.xp || 0,
  streak: fbUser.streak || 0,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const fbUser = await getUser(userId);
      if (fbUser) {
        return firebaseUserToProfile(fbUser);
      }
      return null;
    } catch (err) {
      console.error('❌ FIREBASE: Profile fetch error:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.uid);
      setProfile(profileData);
    }
  };

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profileData = await fetchProfile(firebaseUser.uid);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    inviteToken: string
  ): Promise<{ error: string | null }> => {
    try {
      // Validate invite token first
      const coaching = await getCoachingByInviteToken(inviteToken);
      if (!coaching) {
        return { error: 'Invalid invite token' };
      }

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const uid = userCredential.user.uid;

      // Auto-create user + leaderboard + stats in Firestore (single batch)
      await createUser(uid, {
        name: fullName,
        email,
        coachingId: coaching.coachingId,
      });

      console.log('✅ Firebase Auth + Firestore user created:', uid);
      return { error: null };
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        return { error: 'This email is already registered. Please login instead.' };
      }
      if (err?.code === 'auth/weak-password') {
        return { error: 'Password should be at least 6 characters.' };
      }
      return { error: err?.message || 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { error: null };
    } catch (err: any) {
      console.error('Signin error:', err);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
        return { error: 'Invalid email or password.' };
      }
      return { error: err?.message || 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
    setProfile(null);
  };

  const isOnboarded = !!profile?.student_class && !!profile?.board && !!profile?.tone;
  const coachingId = profile?.coaching_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isOnboarded,
        coachingId,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
