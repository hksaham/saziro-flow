import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import Logo from '@/components/ui/Logo';
import ToneSelector from '@/components/ui/ToneSelector';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Building2, Ticket, ArrowRight, GraduationCap, BookOpen } from 'lucide-react';

type Role = 'teacher' | 'student';

const Signup = () => {
  const { signUp, user, isApproved, isPending, loading } = useAuth();
  const { t } = useTone();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [role, setRole] = useState<Role | null>(tokenFromUrl ? 'student' : null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [coachingName, setCoachingName] = useState('');
  const [inviteToken, setInviteToken] = useState(tokenFromUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (user) {
    if (isPending) return <Navigate to="/pending" replace />;
    if (isApproved) return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    
    setError('');
    setIsLoading(true);

    const result = await signUp(
      email,
      password,
      fullName,
      role,
      role === 'teacher' ? coachingName : undefined,
      role === 'student' ? inviteToken : undefined
    );
    
    if (result.error) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background bg-pattern">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(34,197,94,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="animate-fade-in">
            <Logo size="lg" />
            <h1 className="mt-8 text-4xl xl:text-5xl font-display font-bold text-foreground leading-tight">
              Start Your <br />
              <span className="text-gradient-emerald">Learning Journey</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Teachers create coaching centers. Students join via invite links. Simple and secure.
            </p>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute bottom-20 left-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/4 right-10 w-32 h-32 border border-primary/20 rounded-2xl rotate-12 animate-float delay-300" />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex justify-between items-center p-6">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <ToneSelector />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md animate-scale-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-foreground">
                {t.createAccount}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t.welcome}
              </p>
            </div>

            {/* Role Selection */}
            {!role && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-center text-muted-foreground mb-6">Choose your role to get started</p>
                
                <button
                  onClick={() => setRole('teacher')}
                  className="w-full card-premium p-6 flex items-center gap-4 hover:border-primary/50 transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <GraduationCap className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground text-lg">{t.teacher}</h3>
                    <p className="text-sm text-muted-foreground">Create a coaching center</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => setRole('student')}
                  className="w-full card-premium p-6 flex items-center gap-4 hover:border-primary/50 transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground text-lg">{t.student}</h3>
                    <p className="text-sm text-muted-foreground">Join with invite link</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            )}

            {/* Signup Form */}
            {role && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setRole(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  ← Back to role selection
                </button>

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                    {error}
                  </div>
                )}

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  {role === 'teacher' ? (
                    <GraduationCap className="w-4 h-4 text-primary" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-sm font-medium text-primary">
                    {role === 'teacher' ? t.teacher : t.student}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.fullName}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-premium pl-12"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-premium pl-12"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.password}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-premium pl-12 pr-12"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {role === 'teacher' && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-sm font-medium text-foreground">{t.coachingName}</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={coachingName}
                        onChange={(e) => setCoachingName(e.target.value)}
                        className="input-premium pl-12"
                        placeholder="My Coaching Center"
                        required
                      />
                    </div>
                  </div>
                )}

                {role === 'student' && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-sm font-medium text-foreground">{t.enterInviteToken}</label>
                    <div className="relative">
                      <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        className="input-premium pl-12"
                        placeholder="Paste invite token here"
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t.createAccount}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-muted-foreground">
              {t.alreadyHaveAccount}{' '}
              <Link to="/login" className="text-primary hover:text-primary-glow font-medium transition-colors">
                {t.login}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
