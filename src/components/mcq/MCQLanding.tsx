import { useState } from 'react';
import Logo from '@/components/ui/Logo';
import { 
  BookOpen, 
  Clock, 
  Zap, 
  AlertTriangle, 
  ArrowLeft,
  ChevronRight,
  Target,
  Trophy
} from 'lucide-react';

interface MCQLandingProps {
  subject: string;
  chapter: string;
  totalQuestions: number;
  totalTime: number;
  xpReward: number;
  mode?: 'test' | 'practice';
  onStart: () => void;
  onChangeChapter: () => void;
}

const MCQLanding = ({
  subject,
  chapter,
  totalQuestions,
  totalTime,
  xpReward,
  mode = 'test',
  onStart,
  onChangeChapter
}: MCQLandingProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
          <button
            onClick={onChangeChapter}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all duration-300 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline font-medium">Dashboard</span>
          </button>
          <Logo size="sm" />
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Hero Card */}
          <div 
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5"
            style={{
              boxShadow: isHovered 
                ? '0 25px 80px -12px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(255,255,255,0.05)' 
                : '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Floating Glow */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-50'}`} />
            <div className={`absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-30'}`} />
            
            {/* Content */}
            <div className="relative p-6 sm:p-8">
              {/* Subject Badge */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{subject}</span>
                </div>
              </div>

              {/* Chapter Title */}
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-6 leading-tight">
                {chapter}
              </h1>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="text-center p-4 rounded-xl bg-secondary/50 border border-border/50 group hover:border-primary/30 transition-colors">
                  <Target className="w-5 h-5 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-display font-bold text-foreground">{totalQuestions}</p>
                  <p className="text-xs text-muted-foreground mt-1">Questions</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-secondary/50 border border-border/50 group hover:border-primary/30 transition-colors">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-display font-bold text-foreground">{formatTime(totalTime)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duration</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-secondary/50 border border-border/50 group hover:border-primary/30 transition-colors">
                  <Trophy className="w-5 h-5 text-warning mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-display font-bold text-warning">{xpReward}</p>
                  <p className="text-xs text-muted-foreground mt-1">Max XP</p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20 mb-8">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">{mode === 'test' ? 'Test Rules' : 'Practice Mode'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mode === 'test' 
                      ? 'Once started, the test cannot be paused. Each question has 50 seconds.'
                      : 'Practice at your own pace. No time pressure!'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={onStart}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-lg text-primary-foreground relative overflow-hidden group transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, hsl(152, 69%, 42%) 0%, hsl(152, 69%, 32%) 100%)',
                    boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  {/* Ripple Effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Start {mode === 'test' ? 'Test' : 'Practice'}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <button
                  onClick={onChangeChapter}
                  className="w-full py-3 px-6 rounded-xl font-medium text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground hover:bg-primary/5 transition-all duration-300"
                >
                  Change Chapter
                </button>
              </div>
            </div>
          </div>

          {/* Tip */}
          <p className="text-center text-sm text-muted-foreground/60 mt-6 animate-fade-in delay-300">
            💡 Tip: Read each question carefully before selecting your answer
          </p>
        </div>
      </main>
    </div>
  );
};

export default MCQLanding;
