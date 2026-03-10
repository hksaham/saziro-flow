import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTone } from '@/contexts/ToneContext';
import { getMistakes, MistakeEntry } from '@/lib/firebaseService';
import Logo from '@/components/ui/Logo';
import { 
  ArrowLeft, 
  BookX, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Search,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface WrongAnswer {
  id: string;
  question_text: string;
  options: string[];
  selected_answer: string;
  correct_answer: string;
  subject: string | null;
  created_at: string;
}

interface GroupedMistakes {
  date: string;
  mistakes: WrongAnswer[];
}

const MistakeNotebook = () => {
  const navigate = useNavigate();
  const { user, coachingId } = useAuth();
  const { t } = useTone();
  const [mistakes, setMistakes] = useState<WrongAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchMistakes();
    }
  }, [user]);

  const fetchMistakes = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔥 FIREBASE: Fetching mistakes for user', user.id);
      
      // Fetch from Firebase
      const firebaseMistakes = await getMistakes(user.id, 100);

      // Transform Firebase data to match UI format
      const transformedData: WrongAnswer[] = firebaseMistakes.map((item: MistakeEntry & { id?: string }) => ({
        id: item.id || `mistake_${Date.now()}`,
        question_text: item.questionText,
        options: item.options,
        selected_answer: item.selected,
        correct_answer: item.correct,
        subject: item.subject || null,
        created_at: item.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));

      console.log(`✅ FIREBASE: Loaded ${transformedData.length} mistakes`);
      setMistakes(transformedData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get unique subjects for filter
  const subjects = [...new Set(mistakes.map(m => m.subject).filter(Boolean))] as string[];

  // Filter mistakes
  const filteredMistakes = mistakes.filter(mistake => {
    const matchesSearch = searchQuery === '' || 
      mistake.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || mistake.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Group mistakes by date
  const groupedMistakes: GroupedMistakes[] = filteredMistakes.reduce((groups, mistake) => {
    const date = new Date(mistake.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const existingGroup = groups.find(g => g.date === date);
    if (existingGroup) {
      existingGroup.mistakes.push(mistake);
    } else {
      groups.push({ date, mistakes: [mistake] });
    }
    return groups;
  }, [] as GroupedMistakes[]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-pattern">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading your mistakes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex justify-between items-center h-16 px-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <Logo size="sm" />
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {/* Page Title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
              <BookX className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {t.mistakeNotebook}
              </h1>
              <p className="text-muted-foreground text-sm">
                Last 30 days • {filteredMistakes.length} mistake{filteredMistakes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {subjects.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 rounded-xl bg-card border border-border focus:border-primary outline-none appearance-none cursor-pointer text-foreground min-w-[150px]"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!error && filteredMistakes.length === 0 && (
            <div className="text-center py-16 card-premium animate-scale-in">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <BookX className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                {searchQuery || subjectFilter !== 'all' ? 'No matches found' : 'No mistakes yet!'}
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchQuery || subjectFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Complete some MCQ tests and your wrong answers will appear here for review.'
                }
              </p>
            </div>
          )}

          {/* Mistakes List - Grouped by Date */}
          {groupedMistakes.map((group) => (
            <div key={group.date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{group.date}</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                  {group.mistakes.length}
                </span>
              </div>

              {/* Mistakes for this date */}
              {group.mistakes.map((mistake) => {
                const isExpanded = expandedIds.has(mistake.id);
                const options = Array.isArray(mistake.options) ? mistake.options : [];

                return (
                  <div
                    key={mistake.id}
                    className="card-premium overflow-hidden transition-all duration-300"
                  >
                    {/* Question Header - Always visible */}
                    <button
                      onClick={() => toggleExpand(mistake.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-start gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium line-clamp-2">
                          {mistake.question_text}
                        </p>
                        {mistake.subject && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                            {mistake.subject}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border/50 animate-fade-in">
                        <div className="pt-4 space-y-3">
                          {/* Options */}
                          {options.length > 0 && (
                            <div className="space-y-2">
                              {options.map((option, idx) => {
                                const isSelected = option === mistake.selected_answer;
                                const isCorrect = option === mistake.correct_answer;
                                
                                let optionClasses = 'p-3 rounded-lg border text-sm transition-all ';
                                if (isCorrect) {
                                  optionClasses += 'bg-success/10 border-success/30 text-success';
                                } else if (isSelected) {
                                  optionClasses += 'bg-destructive/10 border-destructive/30 text-destructive';
                                } else {
                                  optionClasses += 'bg-muted/30 border-border text-muted-foreground';
                                }

                                return (
                                  <div key={idx} className={optionClasses}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {String.fromCharCode(65 + idx)}.
                                      </span>
                                      <span className="flex-1">{option}</span>
                                      {isCorrect && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/20">
                                          ✓ Correct
                                        </span>
                                      )}
                                      {isSelected && !isCorrect && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/20">
                                          ✗ Your answer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Summary if no options */}
                          {options.length === 0 && (
                            <div className="space-y-2">
                              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                <span className="text-sm text-destructive">
                                  Your answer: {mistake.selected_answer}
                                </span>
                              </div>
                              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                                <span className="text-sm text-success">
                                  Correct answer: {mistake.correct_answer}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-destructive/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float delay-500" />
      </div>
    </div>
  );
};

export default MistakeNotebook;
