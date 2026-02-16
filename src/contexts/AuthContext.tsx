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
  getCoachingByInviteToken,
  createCoaching,
  FirebaseUser,
} from '@/lib/firebaseService';

type UserRole = 'teacher' | 'student' | null;
type StudentStatus = 'pending' | 'active' | 'rejected' | null;

// Normalized user type for the app (compatible with previous user.id usage)
export interface AppUser {
  id: string;
  email: string | null;
  created_at: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  coaching_id: string | null;
  student_status: StudentStatus;
  student_class: string | null;
  board: string | null;
  tone: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  session: null; // kept for compatibility, always null
  profile: Profile | null;
  loading: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isApproved: boolean;
  isPending: boolean;
  isOnboarded: boolean;
  coachingId: string | null;
  signUp: (email: string, password: string, fullName: string, role: 'teacher' | 'student', coachingName?: string, inviteToken?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase Auth user to AppUser
const toAppUser = (fbAuthUser: FirebaseAuthUser): AppUser => ({
  id: fbAuthUser.uid,
  email: fbAuthUser.email,
  created_at: fbAuthUser.metadata.creationTime || null,
});

// Convert Firebase Firestore user to Profile format
const firebaseUserToProfile = (fbUser: FirebaseUser): Profile => ({
  id: fbUser.uid,
  user_id: fbUser.uid,
  full_name: fbUser.name,
  role: fbUser.role as UserRole,
  coaching_id: fbUser.coachingId,
  student_status: fbUser.status as StudentStatus,
  student_class: fbUser.class || null,
  board: fbUser.board || null,
  tone: fbUser.tone || null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from Firebase Firestore
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔥 FIREBASE: Fetching user profile', userId);
      const fbUser = await getUser(userId);
      if (fbUser) {
        console.log('✅ FIREBASE: User found', fbUser.name);
        return firebaseUserToProfile(fbUser);
      }
      console.log('⚠️ FIREBASE: User not found in Firestore', userId);
      return null;
    } catch (err) {
      console.error('❌ FIREBASE: Profile fetch error:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const appUser = toAppUser(firebaseUser);
        setUser(appUser);
        const profileData = await fetchProfile(firebaseUser.uid);
        setProfile(profileData);
      } else {
        setUser(null);
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
    role: 'teacher' | 'student',
    coachingName?: string,
    inviteToken?: string
  ): Promise<{ error: string | null }> => {
    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseUser = userCredential.user;

      let coachingId: string | null = null;

      if (role === 'teacher' && coachingName) {
        coachingId = await createCoaching(firebaseUser.uid, coachingName);
      } else if (role === 'student' && inviteToken) {
        const coaching = await getCoachingByInviteToken(inviteToken);
        if (!coaching) {
          return { error: 'Invalid invite token' };
        }
        coachingId = coaching.coachingId;
      }

      // Create user profile in Firebase Firestore
      await createUser(firebaseUser.uid, {
        role,
        name: fullName,
        email,
        coachingId,
        status: role === 'student' ? 'pending' : 'active',
      });

      console.log('✅ FIREBASE: User created successfully', firebaseUser.uid);
      return { error: null };
    } catch (err: any) {
      console.error('Signup error:', err);
      const message = err?.message || 'An unexpected error occurred';
      return { error: message };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { error: null };
    } catch (err: any) {
      console.error('Signin error:', err);
      const message = err?.message || 'An unexpected error occurred';
      return { error: message };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
    setProfile(null);
  };

  const isTeacher = profile?.role === 'teacher';
  const isStudent = profile?.role === 'student';
  const isApproved = isTeacher || (isStudent && profile?.student_status === 'active');
  const isPending = isStudent && profile?.student_status === 'pending';
  const isOnboarded = isTeacher || (isStudent && !!profile?.student_class && !!profile?.board && !!profile?.tone);
  const coachingId = profile?.coaching_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        profile,
        loading,
        isTeacher,
        isStudent,
        isApproved,
        isPending,
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
