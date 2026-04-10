import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCoachingsByTeacher,
  createAdditionalShift,
  Coaching,
  ClassLevel,
  GroupType,
  TonePreference,
  SUBJECTS_BY_GROUP,
} from '@/lib/firebaseService';
import {
  ChevronDown, Check, Loader2, Plus, X, Building2, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const CLASS_LEVELS: ClassLevel[] = ['Class 9', 'New 10', 'Old 10'];
const GROUPS: GroupType[] = ['Science', 'Commerce', 'Humanities'];
const TONES: TonePreference[] = ['Formal', 'Banglish', 'Cool'];

// ── Small inline select ────────────────────────────────────────────
const InlineSelect = ({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
  </div>
);

// ── Main component ─────────────────────────────────────────────────
const TeacherShiftSwitcher = () => {
  const { user, coachingId: activeCoachingId, switchCoaching } = useAuth();
  const [shifts, setShifts] = useState<Coaching[]>([]);
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New shift form state
  const [newName, setNewName] = useState('');
  const [newShiftName, setNewShiftName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState<ClassLevel | ''>('');
  const [newGroup, setNewGroup] = useState<GroupType | ''>('');
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [newTone, setNewTone] = useState<TonePreference | ''>('');

  useEffect(() => {
    if (!user) return;
    getCoachingsByTeacher(user.id)
      .then(setShifts)
      .catch(() => toast.error('Failed to load shifts'))
      .finally(() => setLoading(false));
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = async (coachingId: string) => {
    if (coachingId === activeCoachingId || switching) return;
    setSwitching(true);
    try {
      const result = await switchCoaching(coachingId);
      if (result.success) {
        toast.success('Switched shift');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to switch');
      }
    } catch {
      toast.error('Failed to switch shift');
    } finally {
      setSwitching(false);
    }
  };

  const handleGroupChange = (g: string) => {
    const chosen = g as GroupType;
    setNewGroup(chosen);
    setNewSubjects(SUBJECTS_BY_GROUP[chosen] ?? []);
  };

  const toggleSubject = (subj: string) => {
    setNewSubjects(prev =>
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName || !newShiftName || !newClassLevel || !newGroup || !newTone || newSubjects.length === 0) {
      toast.error('Please fill in all fields and select at least one subject');
      return;
    }

    setSaving(true);
    try {
      const newId = await createAdditionalShift(user.id, newName, {
        classLevel: newClassLevel as ClassLevel,
        group: newGroup as GroupType,
        shiftName: newShiftName,
        subjects: newSubjects,
        tonePreference: newTone as TonePreference,
      });

      // Fetch updated list and switch to new shift
      const updated = await getCoachingsByTeacher(user.id);
      setShifts(updated);

      await switchCoaching(newId);
      toast.success(`"${newName}" created and activated`);

      // Reset form
      setNewName(''); setNewShiftName(''); setNewClassLevel('');
      setNewGroup(''); setNewSubjects([]); setNewTone('');
      setShowAddForm(false);
      setOpen(false);
    } catch (err) {
      toast.error('Failed to create shift');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const activeShift = shifts.find(s => s.coachingId === activeCoachingId);
  const activeLabel = activeShift
    ? `${activeShift.shiftName} · ${activeShift.classLevel} · ${activeShift.group}`
    : 'Select Shift';

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => { setOpen(!open); setShowAddForm(false); }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{activeShift?.name || 'Select Shift'}</p>
            {activeShift && (
              <p className="text-xs text-muted-foreground truncate">{activeLabel}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-scale-in">

          {/* Existing shifts */}
          <div className="max-h-64 overflow-y-auto">
            {shifts.map(s => {
              const isActive = s.coachingId === activeCoachingId;
              return (
                <button
                  key={s.coachingId}
                  onClick={() => handleSwitch(s.coachingId)}
                  disabled={isActive || switching}
                  className={`w-full flex items-start justify-between px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0 ${
                    isActive ? 'bg-primary/10' : 'hover:bg-secondary'
                  } disabled:opacity-60`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.shiftName} · {s.classLevel} · {s.group}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-3 mt-0.5">
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                    {switching && !isActive && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add new shift toggle */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border"
            >
              <Plus className="w-4 h-4" />
              Add New Shift
            </button>
          ) : (
            <form onSubmit={handleAddShift} className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">New Shift</p>
                <button type="button" onClick={() => setShowAddForm(false)}>
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>

              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Coaching name (e.g. Bright Future Academy)"
                className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />

              <input
                type="text"
                value={newShiftName}
                onChange={e => setNewShiftName(e.target.value)}
                placeholder="Shift name (e.g. Morning, Evening)"
                className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <InlineSelect
                  value={newClassLevel}
                  onChange={v => setNewClassLevel(v as ClassLevel)}
                  options={CLASS_LEVELS}
                  placeholder="Class level"
                />
                <InlineSelect
                  value={newGroup}
                  onChange={handleGroupChange}
                  options={GROUPS}
                  placeholder="Group"
                />
              </div>

              {newGroup && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(SUBJECTS_BY_GROUP[newGroup as GroupType] ?? []).map(subj => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubject(subj)}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                          newSubjects.includes(subj)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-foreground border-border hover:border-primary/40'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <InlineSelect
                value={newTone}
                onChange={v => setNewTone(v as TonePreference)}
                options={TONES}
                placeholder="Tone preference"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</>
                  : <><ChevronRight className="w-3.5 h-3.5" /> Create Shift</>
                }
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherShiftSwitcher;
