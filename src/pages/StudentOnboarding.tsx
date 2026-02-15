import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser } from '@/lib/firebaseService';
import Logo from '@/components/ui/Logo';
import { Loader2, GraduationCap, MapPin, MessageCircle, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

type StudentClass = '6' | '7' | '8' | '9' | '10';
type Board = 'dhaka' | 'rajshahi' | 'cumilla' | 'jessore' | 'chittagong' | 'barisal' | 'sylhet' | 'dinajpur' | 'mymensingh';
type Tone = 'chill-bro' | 'friendly-banglish' | 'formal-bangla';

const classOptions = [
  { value: '6', label: 'Class 6' },
  { value: '7', label: 'Class 7' },
  { value: '8', label: 'Class 8' },
  { value: '9', label: 'Class 9' },
  { value: '10', label: 'Class 10' },
];

const boardOptions = [
  { value: 'dhaka', label: 'Dhaka' },
  { value: 'rajshahi', label: 'Rajshahi' },
  { value: 'cumilla', label: 'Cumilla' },
  { value: 'jessore', label: 'Jessore' },
  { value: 'chittagong', label: 'Chittagong' },
  { value: 'barisal', label: 'Barisal' },
  { value: 'sylhet', label: 'Sylhet' },
  { value: 'dinajpur', label: 'Dinajpur' },
  { value: 'mymensingh', label: 'Mymensingh' },
];

const toneOptions = [
  { value: 'chill-bro', label: 'Chill Bro' },
  { value: 'friendly-banglish', label: 'Friendly Banglish' },
  { value: 'formal-bangla', label: 'Formal Bangla' },
];

const StudentOnboarding = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.student_class && profile?.board && profile?.tone) {
    return <Navigate to="/dashboard" replace />;
  }

  const isFormValid = studentClass && board && tone;

  const handleSubmit = async () => {
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      await updateUser(user.uid, {
        class: studentClass,
        board: board,
        tone: tone,
      });

      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
      <div className="w-full max-w-md p-6 rounded-lg shadow-md bg-card animate-scale-in">
        <div className="text-center mb-8">
          <Logo size="md" />
          <h2 className="text-3xl font-display font-bold text-foreground mt-4">Welcome!</h2>
          <p className="text-muted-foreground mt-2">Tell us a bit about yourself to get started.</p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in mb-4">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">
              <GraduationCap className="mr-2 inline-block w-5 h-5" />
              What class are you in?
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {classOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStudentClass(option.value as StudentClass)}
                  className={`btn-secondary ${studentClass === option.value ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={nextStep} disabled={!studentClass} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">
              <MapPin className="mr-2 inline-block w-5 h-5" />
              Which education board are you under?
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {boardOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBoard(option.value as Board)}
                  className={`btn-secondary ${board === option.value ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={prevStep} className="btn-ghost">
                <ArrowLeft className="mr-2 w-4 h-4" /> Back
              </button>
              <button onClick={nextStep} disabled={!board} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">
              <MessageCircle className="mr-2 inline-block w-5 h-5" />
              Choose your preferred tone:
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTone(option.value as Tone)}
                  className={`btn-secondary ${tone === option.value ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={prevStep} className="btn-ghost">
                <ArrowLeft className="mr-2 w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !tone}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>Submitting...<Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <>Finish<ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center animate-fade-in">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-foreground">All done!</h3>
            <p className="text-muted-foreground mt-2">You're all set. Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentOnboarding;
