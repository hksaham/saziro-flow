-- Create weekly_leaderboard table for storing aggregated weekly stats per coaching
CREATE TABLE public.weekly_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coaching_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_id TEXT NOT NULL, -- Format: YYYY-WW (ISO week)
  full_name TEXT NOT NULL,
  student_class TEXT,
  board TEXT,
  total_xp INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  tests_taken INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coaching_id, user_id, week_id)
);

-- Create monthly_leaderboard table for storing aggregated monthly stats per coaching
CREATE TABLE public.monthly_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coaching_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  month_id TEXT NOT NULL, -- Format: YYYY-MM
  full_name TEXT NOT NULL,
  student_class TEXT,
  board TEXT,
  total_xp INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  tests_taken INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coaching_id, user_id, month_id)
);

-- Enable RLS on both tables
ALTER TABLE public.weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_leaderboard ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient querying
CREATE INDEX idx_weekly_leaderboard_coaching_week ON public.weekly_leaderboard(coaching_id, week_id);
CREATE INDEX idx_weekly_leaderboard_xp ON public.weekly_leaderboard(total_xp DESC);
CREATE INDEX idx_monthly_leaderboard_coaching_month ON public.monthly_leaderboard(coaching_id, month_id);
CREATE INDEX idx_monthly_leaderboard_xp ON public.monthly_leaderboard(total_xp DESC);

-- RLS Policies for weekly_leaderboard
-- Users can only view leaderboard entries from their own coaching
CREATE POLICY "Users can view weekly leaderboard of their coaching"
ON public.weekly_leaderboard
FOR SELECT
USING (coaching_id = get_user_coaching_id());

-- Users can insert/update their own entries (for test submissions)
CREATE POLICY "Users can upsert their own weekly leaderboard entry"
ON public.weekly_leaderboard
FOR INSERT
WITH CHECK (user_id = auth.uid() AND coaching_id = get_user_coaching_id());

CREATE POLICY "Users can update their own weekly leaderboard entry"
ON public.weekly_leaderboard
FOR UPDATE
USING (user_id = auth.uid());

-- Teachers can view their coaching's leaderboard
CREATE POLICY "Teachers can view weekly leaderboard of their coaching"
ON public.weekly_leaderboard
FOR SELECT
USING (is_teacher_of_coaching(coaching_id));

-- RLS Policies for monthly_leaderboard
CREATE POLICY "Users can view monthly leaderboard of their coaching"
ON public.monthly_leaderboard
FOR SELECT
USING (coaching_id = get_user_coaching_id());

CREATE POLICY "Users can upsert their own monthly leaderboard entry"
ON public.monthly_leaderboard
FOR INSERT
WITH CHECK (user_id = auth.uid() AND coaching_id = get_user_coaching_id());

CREATE POLICY "Users can update their own monthly leaderboard entry"
ON public.monthly_leaderboard
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Teachers can view monthly leaderboard of their coaching"
ON public.monthly_leaderboard
FOR SELECT
USING (is_teacher_of_coaching(coaching_id));

-- Function to get current ISO week ID (YYYY-WW format)
CREATE OR REPLACE FUNCTION public.get_current_week_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT to_char(CURRENT_DATE, 'IYYY-IW');
$$;

-- Function to get current month ID (YYYY-MM format)
CREATE OR REPLACE FUNCTION public.get_current_month_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT to_char(CURRENT_DATE, 'YYYY-MM');
$$;