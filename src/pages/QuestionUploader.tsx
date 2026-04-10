import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCustomQuestions,
  saveCustomQuestions,
  deleteCustomQuestion,
  deleteAllCustomQuestions,
  getCoachingSettings,
  updateCoachingSettings,
  type CustomQuestion,
} from '@/lib/customQuestionsService';
import Logo from '@/components/ui/Logo';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Parse helper ─────────────────────────────────────────────────────────────
// Accepts blocks separated by blank lines. Each block:
//   Line 1      : question text
//   Lines 2–5   : option text (plain text, no prefix required)
//   Last line   : correct index 0-3  OR  letter A/B/C/D
//
// Example:
//   What is the capital of Bangladesh?
//   Dhaka
//   Chittagong
//   Sylhet
//   Rajshahi
//   0
//
// Lines are trimmed; blank separators between blocks are required.

interface ParsedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ParseError {
  block: number;
  message: string;
}

function parsePasteInput(raw: string): { questions: ParsedQuestion[]; errors: ParseError[] } {
  const blocks = raw.trim().split(/\n\s*\n/).filter(b => b.trim());
  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);

    if (lines.length < 6) {
      errors.push({
        block: idx + 1,
        message: `Block ${idx + 1}: needs at least 6 lines (question, 4 options, correct index). Found ${lines.length}.`,
      });
      return;
    }

    const question = lines[0];
    const options = lines.slice(1, 5);
    const correctRaw = lines[5].toLowerCase().trim();

    let correctIndex: number;
    if (['0', '1', '2', '3'].includes(correctRaw)) {
      correctIndex = parseInt(correctRaw);
    } else if (['a', 'b', 'c', 'd'].includes(correctRaw)) {
      correctIndex = ['a', 'b', 'c', 'd'].indexOf(correctRaw);
    } else {
      errors.push({
        block: idx + 1,
        message: `Block ${idx + 1}: correct answer "${lines[5]}" is invalid. Use 0/1/2/3 or A/B/C/D.`,
      });
      return;
    }

    // Optional 7th line: explanation
    const explanation = lines[6] || '';

    questions.push({ question, options, correctIndex, explanation, difficulty: 'medium' });
  });

  return { questions, errors };
}

// ── Component ────────────────────────────────────────────────────────────────

const QuestionUploader = () => {
  const navigate = useNavigate();
  const { user, coachingId, isTeacher } = useAuth();

  const [existingQuestions, setExistingQuestions] = useState<CustomQuestion[]>([]);
  const [useGlobalQuestions, setUseGlobalQuestions] = useState(true);
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [showFormat, setShowFormat] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  // Redirect non-teachers
  useEffect(() => {
    if (!isTeacher) navigate('/dashboard');
  }, [isTeacher, navigate]);

  // Load existing questions + settings
  useEffect(() => {
    if (!coachingId) return;
    (async () => {
      try {
        const [qs, settings] = await Promise.all([
          getCustomQuestions(coachingId),
          getCoachingSettings(coachingId),
        ]);
        setExistingQuestions(qs);
        setUseGlobalQuestions(settings.useGlobalQuestions);
      } catch (err) {
        toast.error('Failed to load questions');
      } finally {
        setLoadingPage(false);
      }
    })();
  }, [coachingId]);

  // Live parse as teacher types
  useEffect(() => {
    if (!pasteText.trim()) {
      setPreview([]);
      setParseErrors([]);
      return;
    }
    const { questions, errors } = parsePasteInput(pasteText);
    setPreview(questions);
    setParseErrors(errors);
  }, [pasteText]);

  const handleToggleGlobal = async () => {
    if (!coachingId || !user) return;
    setTogglingGlobal(true);
    try {
      const next = !useGlobalQuestions;
      await updateCoachingSettings(coachingId, user.id, { useGlobalQuestions: next });
      setUseGlobalQuestions(next);
      toast.success(
        next
          ? 'Global questions re-enabled. Students will see SAZIRO Flow questions when no custom set exists.'
          : 'Global questions disabled. Students will only see your custom questions.'
      );
    } catch (err) {
      toast.error('Failed to update setting');
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleSave = async () => {
    if (!coachingId || !user || preview.length === 0) return;
    setSaving(true);
    try {
      await saveCustomQuestions(coachingId, user.id, preview);
      const updated = await getCustomQuestions(coachingId);
      setExistingQuestions(updated);
      setPasteText('');
      setPreview([]);
      toast.success(`${preview.length} question${preview.length > 1 ? 's' : ''} uploaded successfully`);
    } catch (err) {
      toast.error('Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!coachingId) return;
    setDeletingId(id);
    try {
      await deleteCustomQuestion(coachingId, id);
      setExistingQuestions(prev => prev.filter(q => q.id !== id));
      toast.success('Question deleted');
    } catch (err) {
      toast.error('Failed to delete question');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!coachingId) return;
    setDeletingAll(true);
    try {
      await deleteAllCustomQuestions(coachingId);
      setExistingQuestions([]);
      setShowConfirmDeleteAll(false);
      toast.success('All custom questions deleted');
    } catch (err) {
      toast.error('Failed to delete questions');
    } finally {
      setDeletingAll(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <Logo size="sm" />
          <div className="w-24" />
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Custom Question Uploader</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload your own MCQs for your students. Custom questions always take priority over global ones.
          </p>
        </div>

        {/* ── Global Questions Toggle ── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Global SAZIRO Flow Questions
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {useGlobalQuestions
                  ? 'Currently ON — students see the 900+ SAZIRO Flow question bank when you have no custom questions uploaded.'
                  : 'Currently OFF — students will only see your custom questions. If you have none uploaded, tests will be unavailable.'}
              </p>
              {!useGlobalQuestions && existingQuestions.length === 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Warning: no custom questions uploaded and global is OFF. Students cannot take tests right now.</span>
                </div>
              )}
            </div>
            <button
              onClick={handleToggleGlobal}
              disabled={togglingGlobal}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {togglingGlobal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : useGlobalQuestions ? (
                <ToggleRight className="w-5 h-5 text-primary" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
              )}
              {useGlobalQuestions ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* ── Upload Section ── */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload New Questions
            </h2>
            <button
              onClick={() => setShowFormat(!showFormat)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Format guide
              {showFormat ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Format Guide */}
          {showFormat && (
            <div className="rounded-xl bg-secondary/50 border border-border p-4 text-xs space-y-2 font-mono">
              <p className="text-muted-foreground font-sans font-medium text-sm mb-3">Paste format (separate questions with a blank line):</p>
              <pre className="text-foreground leading-relaxed whitespace-pre-wrap">{`What is the capital of Bangladesh?
Dhaka
Chittagong
Sylhet
Rajshahi
0
Dhaka has been the capital since 1971.

Who wrote Gitanjali?
Rabindranath Tagore
Kazi Nazrul Islam
Michael Madhusudan Datta
Jibanananda Das
A
Gitanjali won the Nobel Prize in 1913.`}</pre>
              <p className="font-sans text-muted-foreground pt-2">
                Line 1: Question · Lines 2–5: Options · Line 6: Correct answer (0/1/2/3 or A/B/C/D) · Line 7 (optional): Explanation
              </p>
            </div>
          )}

          {/* Paste area */}
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={`What is photosynthesis?\nProduction of food by plants\nBreaking down of food\nAbsorption of water\nTransport of minerals\n0\nPlants use sunlight to produce food.\n\nPaste more questions below...`}
            className="w-full h-56 px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="space-y-1">
              {parseErrors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{e.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                {preview.length} question{preview.length > 1 ? 's' : ''} ready to upload
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {preview.map((q, i) => (
                  <div key={i} className="text-xs rounded-lg bg-secondary/50 border border-border p-3">
                    <p className="font-medium text-foreground mb-1">{i + 1}. {q.question}</p>
                    <div className="space-y-0.5">
                      {q.options.map((opt, oi) => (
                        <p key={oi} className={oi === q.correctIndex ? 'text-success font-medium' : 'text-muted-foreground'}>
                          {['A', 'B', 'C', 'D'][oi]}. {opt} {oi === q.correctIndex ? '✓' : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={preview.length === 0 || saving || parseErrors.length > 0}
            className="w-full py-3 rounded-xl font-semibold text-sm btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Plus className="w-4 h-4" /> Upload {preview.length > 0 ? preview.length : ''} Question{preview.length !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* ── Existing Questions ── */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Uploaded Questions
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {existingQuestions.length}
              </span>
            </h2>
            {existingQuestions.length > 0 && !showConfirmDeleteAll && (
              <button
                onClick={() => setShowConfirmDeleteAll(true)}
                className="text-xs text-destructive hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete all
              </button>
            )}
          </div>

          {/* Confirm delete all */}
          {showConfirmDeleteAll && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-4">
              <p className="text-sm text-destructive font-medium">Delete all {existingQuestions.length} custom questions?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmDeleteAll(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-foreground hover:bg-secondary transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="px-3 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {deletingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Confirm
                </button>
              </div>
            </div>
          )}

          {existingQuestions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No custom questions uploaded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {existingQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 group"
                >
                  <span className="text-xs text-muted-foreground font-mono mt-0.5 w-6 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium leading-snug">{q.question}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {q.options.map((opt, oi) => (
                        <span
                          key={oi}
                          className={`text-xs ${oi === q.correctIndex ? 'text-success font-semibold' : 'text-muted-foreground'}`}
                        >
                          {['A', 'B', 'C', 'D'][oi]}. {opt}{oi === q.correctIndex ? ' ✓' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                    className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === q.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default QuestionUploader;
