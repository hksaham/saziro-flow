import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import {
  getUser,
  createUser,
  updateUser,
  getCoachingByInviteToken,
  createCoaching,
  FirebaseUser,
} from '@/lib/firebaseService';

type UserRole = 'teacher' | 'student' | null;
type StudentStatus = 'pending' | 'active' | 'rejected' | null;

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
  user: User | null;
  session: Session | null;
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

// Convert Firebase user to Profile format
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to prevent race conditions
          setTimeout(async () => {
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        fetchProfile(existingSession.user.id).then((profileData) => {
          setProfile(profileData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
      // Sign up the user via Lovable Auth (identity only)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Failed to create user' };
      }

      let coachingId: string | null = null;

      if (role === 'teacher' && coachingName) {
        // Create coaching in Firebase
        coachingId = await createCoaching(authData.user.id, coachingName);
      } else if (role === 'student' && inviteToken) {
        // Find coaching by invite token in Firebase
        const coaching = await getCoachingByInviteToken(inviteToken);
        if (!coaching) {
          return { error: 'Invalid invite token' };
        }
        coachingId = coaching.coachingId;
      }

      // Create user profile in Firebase Firestore
      await createUser(authData.user.id, {
        role,
        name: fullName,
        email,
        coachingId,
        status: role === 'student' ? 'pending' : 'active',
      });

      console.log('✅ FIREBASE: User created successfully', authData.user.id);
      return { error: null };
    } catch (err) {
      console.error('Signup error:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      console.error('Signin error:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
        session,
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
