-- Create live_leaderboard table for real-time leaderboard
CREATE TABLE public.live_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coaching_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  student_class TEXT,
  board TEXT,
  total_xp INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
  tests_taken INTEGER NOT NULL DEFAULT 0,
  last_test_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coaching_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.live_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Students can read their own coaching's leaderboard
CREATE POLICY "Users can view live leaderboard of their coaching"
ON public.live_leaderboard
FOR SELECT
USING (coaching_id = get_my_coaching_id());

-- Teachers can view their coaching's leaderboard
CREATE POLICY "Teachers can view live leaderboard of their coaching"
ON public.live_leaderboard
FOR SELECT
USING (is_coaching_teacher(coaching_id));

-- Users can upsert their own leaderboard entry
CREATE POLICY "Users can insert their own live leaderboard entry"
ON public.live_leaderboard
FOR INSERT
WITH CHECK (user_id = auth.uid() AND coaching_id = get_my_coaching_id());

CREATE POLICY "Users can update their own live leaderboard entry"
ON public.live_leaderboard
FOR UPDATE
USING (user_id = auth.uid() AND coaching_id = get_my_coaching_id());

-- Create index for efficient querying
CREATE INDEX idx_live_leaderboard_coaching_ranking 
ON public.live_leaderboard(coaching_id, total_xp DESC, accuracy DESC, last_test_at ASC);

-- Enable Realtime for live_leaderboard table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_leaderboard;