import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ToneType = 'chill-bro-banglish' | 'friendly-banglish' | 'formal-bangla';

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
}

const toneTexts: Record<ToneType, ToneTexts> = {
  'chill-bro-banglish': {
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
  },
};

interface ToneContextType {
  tone: ToneType;
  setTone: (tone: ToneType) => void;
  t: ToneTexts;
}

const ToneContext = createContext<ToneContextType | undefined>(undefined);

export const ToneProvider = ({ children }: { children: ReactNode }) => {
  const [tone, setTone] = useState<ToneType>('chill-bro-banglish');

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
