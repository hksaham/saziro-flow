import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateUser } from '@/lib/firebaseService';

export type ToneType = 'chill-bro' | 'friendly-banglish' | 'formal-bangla';

interface ToneTexts {
  welcome: string;
  pendingApproval: string;
  pendingDescription: string;
  login: string;
  signup: string;
  teacher: string;
  student: string;
  email: string;
  password: string;
  fullName: string;
  coachingName: string;
  inviteLink: string;
  joinCoaching: string;
  createAccount: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  enterInviteToken: string;
  invalidToken: string;
  approveStudent: string;
  rejectStudent: string;
  pendingStudents: string;
  noStudents: string;
  logout: string;
  dashboard: string;
  waitMessage: string;
  // Student Dashboard - Status Overview
  totalXP: string;
  currentStreak: string;
  // Student Dashboard - Primary Actions
  startDailyTest: string;
  startPractice: string;
  // Student Dashboard - Feature Cards
  mcqs: string;
  cqExplainer: string;
  mistakeNotebook: string;
  suggestions: string;
  leaderboard: string;
  profile: string;
  comingSoon: string;
  // Student Dashboard - Performance
  performanceTitle: string;
  mcqsSmashedToday: string;
  yourRank: string;
  consistencyScore: string;
  // Student Dashboard - Notifications
  notifications: string;
  dailyTestAvailable: string;
  newPracticeSets: string;
  noNotifications: string;
}

const toneTexts: Record<ToneType, ToneTexts> = {
  'chill-bro': {
    welcome: 'Yo! Study Buddy te Welcome! 🔥',
    pendingApproval: 'Bro, Wait Koro! ⏳',
    pendingDescription: 'Tomar teacher tomar request ta dekhe approve korbe. Chill koro, notification ashbe! 😎',
    login: 'Login Kor Bro',
    signup: 'Account Khol',
    teacher: 'Teacher',
    student: 'Student',
    email: 'Email daw',
    password: 'Password daw',
    fullName: 'Tomar naam ki?',
    coachingName: 'Coaching er naam daw',
    inviteLink: 'Invite Link',
    joinCoaching: 'Coaching e Join Kor',
    createAccount: 'Account Create Kor',
    alreadyHaveAccount: 'Already account ache? Login kor!',
    dontHaveAccount: 'Account nai? Signup kor!',
    enterInviteToken: 'Teacher er dewa token ta daw',
    invalidToken: 'Bhai, token ta thik na! 😕',
    approveStudent: 'Approve Kor ✅',
    rejectStudent: 'Reject Kor ❌',
    pendingStudents: 'Pending Students',
    noStudents: 'Kono student nai ekhon',
    logout: 'Logout',
    dashboard: 'Dashboard',
    waitMessage: 'Ektu wait kor, teacher dekhtese...',
    // Student Dashboard - Status Overview
    totalXP: 'Total XP 🔥',
    currentStreak: 'Tomar Streak 🔥',
    // Student Dashboard - Primary Actions
    startDailyTest: 'Cholo Test Di! 💪',
    startPractice: 'Practice Kor Bro',
    // Student Dashboard - Feature Cards
    mcqs: 'MCQs',
    cqExplainer: 'CQ Explainer',
    mistakeNotebook: 'Mistake Notebook',
    suggestions: 'Suggestions',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    comingSoon: 'Coming Soon 🔜',
    // Student Dashboard - Performance
    performanceTitle: 'Tomar Performance Dashboard 📊',
    mcqsSmashedToday: 'Ajke MCQs Smashed',
    yourRank: 'Tomar Rank',
    consistencyScore: 'Consistency Score',
    // Student Dashboard - Notifications
    notifications: 'Updates 🔔',
    dailyTestAvailable: 'Ajker test ready ache bro! 💪',
    newPracticeSets: 'Notun practice sets add hoise!',
    noNotifications: 'Kono notification nai ekhon',
  },
  'friendly-banglish': {
    welcome: 'Study Buddy te Swagotom! 🎓',
    pendingApproval: 'Approval Pending! ⏳',
    pendingDescription: 'Apnar teacher apnar request ta review korchen. Kindly wait korun, approval pele notification paben! 🙂',
    login: 'Login Korun',
    signup: 'Account Khulun',
    teacher: 'Teacher',
    student: 'Student',
    email: 'Email Address',
    password: 'Password',
    fullName: 'Apnar Naam',
    coachingName: 'Coaching er Naam',
    inviteLink: 'Invite Link',
    joinCoaching: 'Coaching e Join Korun',
    createAccount: 'Account Create Korun',
    alreadyHaveAccount: 'Already account ache? Login korun!',
    dontHaveAccount: 'Account nei? Signup korun!',
    enterInviteToken: 'Teacher er dewa invite token ta den',
    invalidToken: 'Token ta valid na! Please check korun.',
    approveStudent: 'Approve Korun ✅',
    rejectStudent: 'Reject Korun ❌',
    pendingStudents: 'Pending Students',
    noStudents: 'Kono pending student nei',
    logout: 'Logout',
    dashboard: 'Dashboard',
    waitMessage: 'Please wait korun, teacher review korchen...',
    // Student Dashboard - Status Overview
    totalXP: 'Total XP',
    currentStreak: 'Current Streak',
    // Student Dashboard - Primary Actions
    startDailyTest: 'Start Daily Test',
    startPractice: 'Start Practice',
    // Student Dashboard - Feature Cards
    mcqs: 'MCQs',
    cqExplainer: 'CQ Explainer',
    mistakeNotebook: 'Mistake Notebook',
    suggestions: 'Suggestions',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    comingSoon: 'Coming Soon',
    // Student Dashboard - Performance
    performanceTitle: 'Your Performance Dashboard 📊',
    mcqsSmashedToday: 'MCQs Smashed Today',
    yourRank: 'Your Rank',
    consistencyScore: 'Consistency Score',
    // Student Dashboard - Notifications
    notifications: 'Notifications 🔔',
    dailyTestAvailable: 'Ajker test ready ache!',
    newPracticeSets: 'New practice sets added!',
    noNotifications: 'No notifications right now',
  },
  'formal-bangla': {
    welcome: 'স্টাডি বাডিতে স্বাগতম! 🎓',
    pendingApproval: 'অনুমোদনের জন্য অপেক্ষমান ⏳',
    pendingDescription: 'আপনার শিক্ষক আপনার অনুরোধ পর্যালোচনা করছেন। অনুগ্রহ করে অপেক্ষা করুন, অনুমোদন পেলে বিজ্ঞপ্তি পাবেন।',
    login: 'লগইন করুন',
    signup: 'অ্যাকাউন্ট খুলুন',
    teacher: 'শিক্ষক',
    student: 'শিক্ষার্থী',
    email: 'ইমেইল ঠিকানা',
    password: 'পাসওয়ার্ড',
    fullName: 'আপনার নাম',
    coachingName: 'কোচিং এর নাম',
    inviteLink: 'আমন্ত্রণ লিঙ্ক',
    joinCoaching: 'কোচিং এ যোগ দিন',
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    alreadyHaveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন!',
    dontHaveAccount: 'অ্যাকাউন্ট নেই? সাইনআপ করুন!',
    enterInviteToken: 'শিক্ষকের দেওয়া আমন্ত্রণ টোকেন দিন',
    invalidToken: 'টোকেনটি সঠিক নয়! অনুগ্রহ করে যাচাই করুন।',
    approveStudent: 'অনুমোদন করুন ✅',
    rejectStudent: 'বাতিল করুন ❌',
    pendingStudents: 'অপেক্ষমান শিক্ষার্থী',
    noStudents: 'কোনো অপেক্ষমান শিক্ষার্থী নেই',
    logout: 'লগআউট',
    dashboard: 'ড্যাশবোর্ড',
    waitMessage: 'অনুগ্রহ করে অপেক্ষা করুন, শিক্ষক পর্যালোচনা করছেন...',
    // Student Dashboard - Status Overview
    totalXP: 'মোট এক্সপি',
    currentStreak: 'বর্তমান স্ট্রিক',
    // Student Dashboard - Primary Actions
    startDailyTest: 'দৈনিক পরীক্ষা শুরু করুন',
    startPractice: 'অনুশীলন শুরু করুন',
    // Student Dashboard - Feature Cards
    mcqs: 'এমসিকিউ',
    cqExplainer: 'সিকিউ ব্যাখ্যাকারী',
    mistakeNotebook: 'ভুল নোটবুক',
    suggestions: 'পরামর্শ',
    leaderboard: 'লিডারবোর্ড',
    profile: 'প্রোফাইল',
    comingSoon: 'শীঘ্রই আসছে',
    // Student Dashboard - Performance
    performanceTitle: 'আপনার পারফরম্যান্স ড্যাশবোর্ড 📊',
    mcqsSmashedToday: 'আজকে সমাধানকৃত এমসিকিউ',
    yourRank: 'আপনার র‍্যাঙ্ক',
    consistencyScore: 'ধারাবাহিকতা স্কোর',
    // Student Dashboard - Notifications
    notifications: 'বিজ্ঞপ্তি 🔔',
    dailyTestAvailable: 'আজকের পরীক্ষা প্রস্তুত',
    newPracticeSets: 'নতুন অনুশীলন সেট যোগ করা হয়েছে',
    noNotifications: 'এই মুহূর্তে কোনো বিজ্ঞপ্তি নেই',
  },
};

interface ToneContextType {
  tone: ToneType;
  setTone: (tone: ToneType) => void;
  t: ToneTexts;
}

const ToneContext = createContext<ToneContextType | undefined>(undefined);

export const ToneProvider = ({ children }: { children: ReactNode }) => {
  const [tone, setToneState] = useState<ToneType>('chill-bro');

  // Sync tone from profile on mount
  useEffect(() => {
    const fetchProfileTone = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tone')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.tone && ['chill-bro', 'friendly-banglish', 'formal-bangla'].includes(profile.tone)) {
          setToneState(profile.tone as ToneType);
        }
      }
    };
    fetchProfileTone();
  }, []);

  const setTone = async (newTone: ToneType) => {
    setToneState(newTone);
    // Persist to Firebase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await updateUser(user.id, { tone: newTone });
      console.log('✅ FIREBASE: Tone updated to', newTone);
    }
  };

  return (
    <ToneContext.Provider value={{ tone, setTone, t: toneTexts[tone] }}>
      {children}
    </ToneContext.Provider>
  );
};

export const useTone = () => {
  const context = useContext(ToneContext);
  if (!context) {
    throw new Error('useTone must be used within a ToneProvider');
  }
  return context;
};
