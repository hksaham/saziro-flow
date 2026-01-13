import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/ui/Logo';
import { Loader2, GraduationCap, MapPin, MessageCircle, ArrowRight, CheckCircle } from 'lucide-react';

type StudentClass = 'class-9' | 'class-10' | 'old-10';
type Board = 'dhaka' | 'chattogram' | 'rajshahi' | 'cumilla' | 'jessore' | 'sylhet' | 'dinajpur' | 'madrasah' | 'technical';
type Tone = 'chill-bro' | 'friendly-banglish' | 'formal-bangla';

const CLASS_OPTIONS: { value: StudentClass; label: string; labelBn: string }[] = [
  { value: 'class-9', label: 'Class 9', labelBn: 'নবম শ্রেণী' },
  { value: 'class-10', label: 'Class 10', labelBn: 'দশম শ্রেণী' },
  { value: 'old-10', label: 'Old Class 10', labelBn: 'পুরাতন দশম' },
];

const BOARD_OPTIONS: { value: Board; label: string; labelBn: string }[] = [
  { value: 'dhaka', label: 'Dhaka', labelBn: 'ঢাকা' },
  { value: 'chattogram', label: 'Chattogram', labelBn: 'চট্টগ্রাম' },
  { value: 'rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী' },
  { value: 'cumilla', label: 'Cumilla', labelBn: 'কুমিল্লা' },
  { value: 'jessore', label: 'Jessore', labelBn: 'যশোর' },
  { value: 'sylhet', label: 'Sylhet', labelBn: 'সিলেট' },
  { value: 'dinajpur', label: 'Dinajpur', labelBn: 'দিনাজপুর' },
  { value: 'madrasah', label: 'Madrasah', labelBn: 'মাদ্রাসা' },
  { value: 'technical', label: 'Technical', labelBn: 'কারিগরি' },
];

const TONE_OPTIONS: { value: Tone; label: string; description: string; emoji: string }[] = [
  { value: 'chill-bro', label: 'Chill Bro', description: 'Casual & fun Banglish vibes 😎', emoji: '🔥' },
  { value: 'friendly-banglish', label: 'Friendly Banglish', description: 'Friendly mix of Bangla & English 🙂', emoji: '✨' },
  { value: 'formal-bangla', label: 'Formal Bangla', description: 'শুদ্ধ বাংলায় 📚', emoji: '📖' },
];

const StudentOnboarding = () => {
  const { user, profile, loading, refreshProfile, isStudent } = useAuth();
  const navigate = useNavigate();

  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // If loading, show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If not a student, redirect to dashboard
  if (profile && !isStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  // If already onboarded (has class, board, tone), redirect to appropriate page
  if (profile?.student_class && profile?.board && profile?.tone) {
    if (profile.student_status === 'pending') {
      return <Navigate to="/pending" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const isFormValid = studentClass && board && tone;

  const handleSubmit = async () => {
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          student_class: studentClass,
          board: board,
          tone: tone,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        setError('Failed to save your preferences. Please try again.');
        return;
      }

      // Refresh the profile to get updated data
      await refreshProfile();

      // Navigate based on status
      if (profile?.student_status === 'pending') {
        navigate('/pending', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && studentClass) setStep(2);
    else if (step === 2 && board) setStep(3);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-background bg-pattern flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Logo size="sm" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-primary'
                    : s < step
                    ? 'w-6 bg-primary/50'
                    : 'w-6 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Class Selection */}
          {step === 1 && (
            <div className="animate-scale-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Which class are you in?
                </h1>
                <p className="text-muted-foreground mt-2">
                  তোমার ক্লাস সিলেক্ট করো
                </p>
              </div>

              <div className="space-y-3">
                {CLASS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStudentClass(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      studentClass === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.labelBn}</p>
                    </div>
                    {studentClass === option.value && (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={nextStep}
                disabled={!studentClass}
                className="w-full btn-primary mt-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Board Selection */}
          {step === 2 && (
            <div className="animate-scale-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Select your Board
                </h1>
                <p className="text-muted-foreground mt-2">
                  তোমার বোর্ড সিলেক্ট করো
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {BOARD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setBoard(option.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      board === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <p className="font-semibold text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.labelBn}</p>
                    {board === option.value && (
                      <CheckCircle className="w-5 h-5 text-primary mt-2" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!board}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tone Selection */}
          {step === 3 && (
            <div className="animate-scale-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Choose your vibe
                </h1>
                <p className="text-muted-foreground mt-2">
                  কিভাবে কথা বলব তোমার সাথে?
                </p>
              </div>

              <div className="space-y-3">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      tone === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-foreground">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {tone === option.value && (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 btn-secondary"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Let's Go!
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Integrity Notice */}
          <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
            Anti-cheat system is active. Suspicious activity may reset streaks and XP.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentOnboarding;