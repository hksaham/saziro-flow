import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { firebaseAuth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Logo from '@/components/ui/Logo';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Target,
  Zap,
  Calendar,
  CalendarDays,
  Crown,
  AlertCircle,
  Radio,
} from 'lucide-react';

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBadgeVariant = (rank: number): "default" | "secondary" | "outline" => {
  if (rank === 1) return "default";
  if (rank <= 3) return "secondary";
  return "outline";
};

interface LeaderboardTableProps {
  entries: Array<{
    id: string;
    user_id: string;
    full_name: string;
    student_class: string | null;
    board: string | null;
    total_xp: number;
    accuracy: number;
    tests_taken: number;
    rank?: number;
  }>;
  currentUserId: string | undefined;
  loading: boolean;
  isLive?: boolean;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries, currentUserId, loading, isLive }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No test submissions yet</p>
        <p className="text-sm text-muted-foreground mt-1">Be the first to top the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const rank = entry.rank || index + 1;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
              isCurrentUser
                ? 'bg-primary/10 border-2 border-primary shadow-sm'
                : 'bg-card border border-border hover:bg-muted/50'
            }`}
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-10">
              {getRankIcon(rank)}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                  {entry.full_name}
                </span>
                {isCurrentUser && (
                  <Badge variant="default" className="text-xs">You</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {entry.student_class && <span>{entry.student_class}</span>}
                {entry.board && (
                  <>
                    <span>•</span>
                    <span>{entry.board}</span>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-right">
              <div className="hidden sm:block">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Target className="w-3 h-3" />
                  <span>{entry.accuracy.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.tests_taken} tests
                </div>
              </div>
              <div>
                <Badge variant={getRankBadgeVariant(rank)} className="text-lg font-bold px-3 py-1">
                  <Zap className="w-4 h-4 mr-1" />
                  {entry.total_xp}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, coachingId } = useAuth();
  const { live, weekly, monthly, userLiveRank, userWeeklyRank, userMonthlyRank, loading, error } = useLeaderboard();
  const [activeTab, setActiveTab] = useState<'live' | 'weekly' | 'monthly'>('live');

  console.log("AUTH STATE", {
    firebaseUser: firebaseAuth.currentUser,
    uid: firebaseAuth.currentUser?.uid,
  });

  // Block if no coaching
  if (!coachingId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Coaching Assigned</h2>
          <p className="text-muted-foreground mb-6">
            You need to be part of a coaching to view the leaderboard.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Logo size="sm" />
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Your coaching's top performers
          </p>
        </div>

        {/* User Rank Summary */}
        {(userLiveRank || userWeeklyRank || userMonthlyRank) && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                {userLiveRank && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Radio className="w-4 h-4 text-red-500" />
                      Live
                    </div>
                    <Badge variant="destructive" className="text-lg px-3 py-1">
                      Rank #{userLiveRank}
                    </Badge>
                  </div>
                )}
                {userWeeklyRank && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      Weekly
                    </div>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      Rank #{userWeeklyRank}
                    </Badge>
                  </div>
                )}
                {userMonthlyRank && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <CalendarDays className="w-4 h-4" />
                      Monthly
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      Rank #{userMonthlyRank}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'live' | 'weekly' | 'monthly')}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="live" className="gap-2">
              <Radio className="w-4 h-4" />
              <span className="relative">
                Live
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2">
              <Calendar className="w-4 h-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-500" />
                  Live Rankings
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-red-500">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Real-time
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardTable
                  entries={live}
                  currentUserId={user?.id}
                  loading={loading}
                  isLive
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  This Week's Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardTable
                  entries={weekly}
                  currentUserId={user?.id}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  This Month's Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardTable
                  entries={monthly}
                  currentUserId={user?.id}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error State */}
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
          <p>🔴 Live rankings update instantly after each test</p>
          <p>📊 Rankings based on TEST mode submissions only</p>
          <p>⚡ XP: +10 per correct, -5 per wrong answer</p>
          <p>🔄 Weekly/Monthly leaderboards reset periodically</p>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
