import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
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
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
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
    inviteToken: string
  ): Promise<{ error: string | null }> => {
    try {
      // Validate invite token first
      const coaching = await getCoachingByInviteToken(inviteToken);
      if (!coaching) {
        return { error: 'Invalid invite token' };
      }

      // Sign up via Supabase Auth (identity only)
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

      // Auto-create user + leaderboard + stats in Firebase (single batch)
      await createUser(authData.user.id, {
        name: fullName,
        email,
        coachingId: coaching.coachingId,
      });

      console.log('✅ User created with auto-leaderboard entry:', authData.user.id);
      return { error: null };
    } catch (err) {
      console.error('Signup error:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  const isOnboarded = !!profile?.student_class && !!profile?.board && !!profile?.tone;
  const coachingId = profile?.coaching_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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
