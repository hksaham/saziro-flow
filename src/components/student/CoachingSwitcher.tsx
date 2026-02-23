import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserCoachings,
  getCoaching,
  CoachingMembership,
} from '@/lib/firebaseService';
import { ChevronUp, Check, Loader2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface CoachingOption {
  coachingId: string;
  name: string;
}

const CoachingSwitcher = () => {
  const { user, coachingId: activeCoachingId, switchCoaching } = useAuth();
  const [coachings, setCoachings] = useState<CoachingOption[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCoachings();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchCoachings = async () => {
    if (!user) return;
    try {
      const memberships = await getUserCoachings(user.id);
      const options: CoachingOption[] = [];
      for (const m of memberships) {
        const coaching = await getCoaching(m.coachingId);
        options.push({
          coachingId: m.coachingId,
          name: coaching?.name || 'Unknown',
        });
      }
      setCoachings(options);
    } catch (err) {
      console.error('Error fetching coachings for switcher:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (coachingId: string) => {
    if (coachingId === activeCoachingId || switching) return;
    setSwitching(true);
    try {
      const result = await switchCoaching(coachingId);
      if (result.success) {
        toast.success('Coaching switched!');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to switch');
      }
    } catch {
      toast.error('Failed to switch coaching');
    } finally {
      setSwitching(false);
    }
  };

  if (loading || coachings.length <= 1) return null;

  const activeName = coachings.find((c) => c.coachingId === activeCoachingId)?.name || 'Select Coaching';

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{activeName}</span>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-scale-in">
          <div className="py-1">
            {coachings.map((c) => {
              const isActive = c.coachingId === activeCoachingId;
              return (
                <button
                  key={c.coachingId}
                  onClick={() => handleSwitch(c.coachingId)}
                  disabled={isActive || switching}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
                  {switching && !isActive && (
                    <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachingSwitcher;
