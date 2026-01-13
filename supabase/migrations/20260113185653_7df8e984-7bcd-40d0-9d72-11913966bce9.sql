
-- Create user_stats table for XP and streaks
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  coaching_id UUID REFERENCES public.coachings(id),
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mcq_performance table for tracking each attempt
CREATE TABLE public.mcq_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coaching_id UUID REFERENCES public.coachings(id),
  mode TEXT NOT NULL CHECK (mode IN ('test', 'practice')),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  wrong_answers INTEGER NOT NULL,
  score_percentage NUMERIC(5,2) NOT NULL,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mcq_wrong_answers table for mistake notebook
CREATE TABLE public.mcq_wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  performance_id UUID REFERENCES public.mcq_performance(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_wrong_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_stats
CREATE POLICY "Users can view their own stats"
  ON public.user_stats FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stats"
  ON public.user_stats FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view stats of their coaching students"
  ON public.user_stats FOR SELECT
  USING (is_teacher_of_coaching(coaching_id));

-- RLS policies for mcq_performance
CREATE POLICY "Users can view their own performance"
  ON public.mcq_performance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own performance"
  ON public.mcq_performance FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view performance of their coaching students"
  ON public.mcq_performance FOR SELECT
  USING (is_teacher_of_coaching(coaching_id));

-- RLS policies for mcq_wrong_answers
CREATE POLICY "Users can view their own wrong answers"
  ON public.mcq_wrong_answers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wrong answers"
  ON public.mcq_wrong_answers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at on user_stats
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mcq_performance;

-- Create indexes for performance
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX idx_mcq_performance_user_id ON public.mcq_performance(user_id);
CREATE INDEX idx_mcq_performance_created_at ON public.mcq_performance(created_at DESC);
CREATE INDEX idx_mcq_wrong_answers_user_id ON public.mcq_wrong_answers(user_id);
