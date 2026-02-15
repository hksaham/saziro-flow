import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/ui/Logo';
import { useTone } from '@/contexts/ToneContext';
import { ArrowRight, BookOpen, Zap, Shield, Target, CheckCircle2 } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const { t } = useTone();

  const getDashboardLink = () => {
    if (!user) return '/login';
    return '/dashboard';
  };

  const features = [
    {
      icon: BookOpen,
      title: 'Smart MCQs',
      description: 'Practice with thousands of curated questions designed to boost your scores.'
    },
    {
      icon: Zap,
      title: 'XP & Streaks',
      description: 'Earn XP, maintain streaks, and climb the leaderboard with daily tests.'
    },
    {
      icon: Target,
      title: 'Mistake Notebook',
      description: 'Track your mistakes and turn weaknesses into strengths.'
    },
    {
      icon: Shield,
      title: 'Anti-Cheat System',
      description: 'Fair play enforced with tab-switch detection and timed questions.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
          <Logo size="sm" />
          <Link
            to={getDashboardLink()}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 md:text-base md:px-6 md:py-3 md:gap-2"
          >
            {user ? t.dashboard : t.login}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,197,94,0.12),transparent_60%)]" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float delay-500" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-primary">SSC Exam Preparation Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground leading-tight animate-fade-in delay-100">
            Master Your{' '}
            <span className="text-gradient-emerald">SSC Exams</span>
            <br />
            Like a Pro
          </h1>

          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in delay-200">
            Join the most advanced coaching platform designed specifically for SSC preparation.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-300">
            <Link to="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-4">
              {t.login}
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in delay-400">
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-emerald">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-emerald">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">MCQs Solved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-emerald">95%</div>
              <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-border bg-card/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Why Choose <span className="text-gradient-emerald">Study Buddy</span>?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Everything you need to excel in your SSC exams, all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-premium p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              How It <span className="text-gradient-emerald">Works</span>
            </h2>
          </div>

          <div className="space-y-6">
            {[
              { step: '01', title: 'Join with Invite Link', desc: 'Get an invite link from your coaching center and sign up instantly.' },
              { step: '02', title: 'Complete Onboarding', desc: 'Select your class, board, and preferred language tone.' },
              { step: '03', title: 'Take Daily Tests', desc: 'Complete 30-question daily tests to earn XP and climb the leaderboard.' },
              { step: '04', title: 'Track & Improve', desc: 'Review mistakes, practice more, and watch your scores improve.' },
            ].map((item, index) => (
              <div
                key={item.step}
                className="flex items-start gap-6 p-6 rounded-xl bg-card/50 border border-border hover:border-primary/30 transition-colors animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 ml-auto hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-border">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Ready to Start Your <span className="text-gradient-emerald">Journey</span>?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of students already on the platform.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex btn-primary text-lg px-10 py-4 items-center gap-2"
          >
            Create Your Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <Logo size="sm" showText={false} />
          <p className="text-sm text-muted-foreground">
            © 2025 Study Buddy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
