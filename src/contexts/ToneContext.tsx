import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { updateUser, getUser } from '@/lib/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export type ToneType = 'chill-bro' | 'friendly-banglish' | 'formal-bangla';

interface ToneTexts {
  welcome: string;
  login: string;
  signup: string;
  email: string;
  password: string;
  fullName: string;
  joinCoaching: string;
  createAccount: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  enterInviteToken: string;
  invalidToken: string;
  logout: string;
  dashboard: string;
  // Student Dashboard
  totalXP: string;
  currentStreak: string;
  startDailyTest: string;
  startPractice: string;
  mcqs: string;
  cqExplainer: string;
  mistakeNotebook: string;
  suggestions: string;
  leaderboard: string;
  profile: string;
  comingSoon: string;
  performanceTitle: string;
  mcqsSmashedToday: string;
  yourRank: string;
  consistencyScore: string;
  notifications: string;
  dailyTestAvailable: string;
  newPracticeSets: string;
  noNotifications: string;
}

const toneTexts: Record<ToneType, ToneTexts> = {
  'chill-bro': {
    welcome: 'Yo! Study Buddy te Welcome! 🔥',
    login: 'Do Login Bro',
    signup: 'Account Khol',
    email: 'Email daw',
    password: 'Password daw',
    fullName: 'Tomar naam ki?',
    joinCoaching: 'Coaching e Join Kor',
    createAccount: 'Account Create Kor',
    alreadyHaveAccount: 'Already account ache? Login kor!',
    dontHaveAccount: 'Account nai? Signup kor!',
    enterInviteToken: 'Teacher er dewa token ta daw',
    invalidToken: 'Bhai, token ta thik na! 😕',
    logout: 'Logout',
    dashboard: 'Dashboard',
    totalXP: 'Total XP 🔥',
    currentStreak: 'Tomar Streak 🔥',
    startDailyTest: 'Cholo Test Di! 💪',
    startPractice: 'Practice Kor Bro',
    mcqs: 'MCQs',
    cqExplainer: 'CQ Explainer',
    mistakeNotebook: 'Mistake Notebook',
    suggestions: 'Suggestions',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    comingSoon: 'Coming Soon 🔜',
    performanceTitle: 'Tomar Performance Dashboard 📊',
    mcqsSmashedToday: 'Ajke MCQs Smashed',
    yourRank: 'Tomar Rank',
    consistencyScore: 'Consistency Score',
    notifications: 'Updates 🔔',
    dailyTestAvailable: 'Ajker test ready ache bro! 💪',
    newPracticeSets: 'Notun practice sets add hoise!',
    noNotifications: 'Kono notification nai ekhon',
  },
  'friendly-banglish': {
    welcome: 'Study Buddy te Swagotom! 🎓',
    login: 'Login Korun',
    signup: 'Account Khulun',
    email: 'Email Address',
    password: 'Password',
    fullName: 'Apnar Naam',
    joinCoaching: 'Coaching e Join Korun',
    createAccount: 'Account Create Korun',
    alreadyHaveAccount: 'Already account ache? Login korun!',
    dontHaveAccount: 'Account nei? Signup korun!',
    enterInviteToken: 'Teacher er dewa invite token ta den',
    invalidToken: 'Token ta valid na! Please check korun.',
    logout: 'Logout',
    dashboard: 'Dashboard',
    totalXP: 'Total XP',
    currentStreak: 'Current Streak',
    startDailyTest: 'Start Daily Test',
    startPractice: 'Start Practice',
    mcqs: 'MCQs',
    cqExplainer: 'CQ Explainer',
    mistakeNotebook: 'Mistake Notebook',
    suggestions: 'Suggestions',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    comingSoon: 'Coming Soon',
    performanceTitle: 'Your Performance Dashboard 📊',
    mcqsSmashedToday: 'MCQs Smashed Today',
    yourRank: 'Your Rank',
    consistencyScore: 'Consistency Score',
    notifications: 'Notifications 🔔',
    dailyTestAvailable: 'Ajker test ready ache!',
    newPracticeSets: 'New practice sets added!',
    noNotifications: 'No notifications right now',
  },
  'formal-bangla': {
    welcome: 'স্টাডি বাডিতে স্বাগতম! 🎓',
    login: 'লগইন করুন',
    signup: 'অ্যাকাউন্ট খুলুন',
    email: 'ইমেইল ঠিকানা',
    password: 'পাসওয়ার্ড',
    fullName: 'আপনার নাম',
    joinCoaching: 'কোচিং এ যোগ দিন',
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    alreadyHaveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন!',
    dontHaveAccount: 'অ্যাকাউন্ট নেই? সাইনআপ করুন!',
    enterInviteToken: 'শিক্ষকের দেওয়া আমন্ত্রণ টোকেন দিন',
    invalidToken: 'টোকেনটি সঠিক নয়! অনুগ্রহ করে যাচাই করুন।',
    logout: 'লগআউট',
    dashboard: 'ড্যাশবোর্ড',
    totalXP: 'মোট এক্সপি',
    currentStreak: 'বর্তমান স্ট্রিক',
    startDailyTest: 'দৈনিক পরীক্ষা শুরু করুন',
    startPractice: 'অনুশীলন শুরু করুন',
    mcqs: 'এমসিকিউ',
    cqExplainer: 'সিকিউ ব্যাখ্যাকারী',
    mistakeNotebook: 'ভুল নোটবুক',
    suggestions: 'পরামর্শ',
    leaderboard: 'লিডারবোর্ড',
    profile: 'প্রোফাইল',
    comingSoon: 'শীঘ্রই আসছে',
    performanceTitle: 'আপনার পারফরম্যান্স ড্যাশবোর্ড 📊',
    mcqsSmashedToday: 'আজকে সমাধানকৃত এমসিকিউ',
    yourRank: 'আপনার র‍্যাঙ্ক',
    consistencyScore: 'ধারাবাহিকতা স্কোর',
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const fbUser = await getUser(firebaseUser.uid);
        if (fbUser?.tone && ['chill-bro', 'friendly-banglish', 'formal-bangla'].includes(fbUser.tone)) {
          setToneState(fbUser.tone as ToneType);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const setTone = async (newTone: ToneType) => {
    setToneState(newTone);
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      await updateUser(currentUser.uid, { tone: newTone });
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
