import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserCoachings,
  getCoaching,
  getCoachingByInviteToken,
  addUserCoaching,
  CoachingMembership,
  Coaching,
} from '@/lib/firebaseService';
// No direct Firestore imports needed — all logic in firebaseService
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Check,
  Plus,
  Loader2,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CoachingWithDetails extends CoachingMembership {
  name: string;
  membershipStatus: 'pending' | 'approved' | 'rejected';
}

const ManageCoachings = () => {
  const { user, profile, coachingId: activeCoachingId, switchCoaching, refreshProfile } = useAuth();
  const [coachings, setCoachings] = useState<CoachingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    fetchCoachings();
  }, [user]);

  const fetchCoachings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const memberships = await getUserCoachings(user.id);
      const detailed: CoachingWithDetails[] = [];

      for (const m of memberships) {
        const coaching = await getCoaching(m.coachingId);
        detailed.push({
          ...m,
          name: coaching?.name || 'Unknown Coaching',
        });
      }

      setCoachings(detailed);
    } catch (err) {
      console.error('Error fetching coachings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !inviteCode.trim()) return;
    setJoining(true);

    try {
      // Validate invite token
      const coaching = await getCoachingByInviteToken(inviteCode.trim());
      if (!coaching) {
        toast.error('Invalid invite code. Please check and try again.');
        return;
      }

      // Add membership (returns info about existing membership)
      const result = await addUserCoaching(user.id, coaching.coachingId, 'student');

      if (result.alreadyExists) {
        if (result.status === 'pending') {
          toast.info('You already requested to join this coaching. Waiting for teacher approval.');
        } else if (result.status === 'rejected') {
          toast.error('Your request to this coaching was rejected.');
        } else {
          toast.info('You are already in this coaching.');
        }
        return;
      }

      // DO NOT create leaderboard entry — teacher must approve first
      // DO NOT set activeCoachingId — teacher must approve first

      setInviteCode('');
      toast.success('Request sent. Waiting for teacher approval.');
      await fetchCoachings();
    } catch (err) {
      console.error('Error joining coaching:', err);
      toast.error('Failed to join coaching. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleSwitch = async (targetCoachingId: string) => {
    if (targetCoachingId === activeCoachingId) return;
    const membership = coachings.find((c) => c.coachingId === targetCoachingId);
    if (membership?.membershipStatus !== 'approved') {
      toast.error('This coaching is not yet approved.');
      return;
    }
    setSwitching(targetCoachingId);
    try {
      const result = await switchCoaching(targetCoachingId);
      if (result.success) {
        toast.success('Coaching switched!');
      } else {
        toast.error(result.error || 'Failed to switch');
      }
    } catch (err) {
      toast.error('Failed to switch coaching');
    } finally {
      setSwitching(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <section className="space-y-4 animate-fade-in delay-300">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
        <GraduationCap className="w-4 h-4" />
        My Coachings
      </h3>

      <div className="card-premium p-4 space-y-4">
        {/* Coaching List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : coachings.length === 0 ? (
          <div className="text-center py-6">
            <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No coachings joined yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coachings.map((c) => {
              const isActive = c.coachingId === activeCoachingId;
              return (
                <div
                  key={c.coachingId}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-secondary/30 hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-primary/20' : 'bg-secondary'
                      }`}
                    >
                      <GraduationCap
                        className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                        {c.name}
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary">
                            ACTIVE
                          </span>
                        )}
                        {c.membershipStatus === 'pending' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/20 text-warning">
                            PENDING
                          </span>
                        )}
                        {c.membershipStatus === 'rejected' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/20 text-destructive">
                            REJECTED
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(c.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {!isActive && c.membershipStatus === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwitch(c.coachingId)}
                      disabled={switching === c.coachingId}
                      className="flex-shrink-0 text-xs h-8"
                    >
                      {switching === c.coachingId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ArrowRightLeft className="w-3 h-3 mr-1" />
                          Set Active
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Join New Coaching */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Join a new coaching</p>
          <div className="flex gap-2">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="h-9 text-sm bg-secondary"
            />
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={joining || !inviteCode.trim()}
              className="flex-shrink-0 h-9"
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Join
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageCoachings;
