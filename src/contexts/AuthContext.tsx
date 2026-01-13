import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type UserRole = 'teacher' | 'student' | null;
type StudentStatus = 'pending' | 'approved' | 'rejected' | null;

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error('Profile fetch error:', err);
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
      // Sign up the user
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
        // Create coaching for teacher
        const { data: coachingData, error: coachingError } = await supabase
          .from('coachings')
          .insert({
            name: coachingName,
            teacher_id: authData.user.id,
          })
          .select()
          .single();

        if (coachingError) {
          console.error('Coaching creation error:', coachingError);
          return { error: 'Failed to create coaching center' };
        }
        coachingId = coachingData.id;
      } else if (role === 'student' && inviteToken) {
        // Find coaching by invite token
        const { data: coachingData, error: coachingError } = await supabase
          .from('coachings')
          .select('id')
          .eq('invite_token', inviteToken)
          .maybeSingle();

        if (coachingError || !coachingData) {
          return { error: 'Invalid invite token' };
        }
        coachingId = coachingData.id;
      }

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: fullName,
        role,
        coaching_id: coachingId,
        student_status: role === 'student' ? 'pending' : null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { error: 'Failed to create profile' };
      }

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
  const isApproved = isTeacher || (isStudent && profile?.student_status === 'approved');
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
