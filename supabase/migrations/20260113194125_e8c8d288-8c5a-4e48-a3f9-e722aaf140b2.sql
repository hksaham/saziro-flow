-- =============================================
-- DAILY TEST SYSTEM & STRICT LIMIT ENFORCEMENT
-- =============================================

-- 1. Create daily_tests table - stores unique daily test per coaching
CREATE TABLE public.daily_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_ids JSONB NOT NULL, -- Array of 30 question IDs from Firestore
  mcq_set_id TEXT NOT NULL, -- Reference to Firestore mcq_set document
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each coaching gets exactly ONE test per day
  UNIQUE(coaching_id, test_date)
);

-- 2. Create daily_test_attempts table - tracks which students completed daily test
CREATE TABLE public.daily_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coaching_id UUID NOT NULL REFERENCES public.coachings(id),
  daily_test_id UUID NOT NULL REFERENCES public.daily_tests(id),
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  performance_id UUID REFERENCES public.mcq_performance(id),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each student can only take ONE daily test per day
  UNIQUE(user_id, test_date)
);

-- 3. Create practice_attempts table - tracks daily practice set usage (max 6/day)
CREATE TABLE public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coaching_id UUID REFERENCES public.coachings(id),
  attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  set_number INTEGER NOT NULL CHECK (set_number >= 1 AND set_number <= 6),
  performance_id UUID REFERENCES public.mcq_performance(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each student can have max 6 practice sets per day (tracked by set_number)
  UNIQUE(user_id, attempt_date, set_number)
);

-- 4. Add mode column to mcq_wrong_answers to track test vs practice mistakes
ALTER TABLE public.mcq_wrong_answers 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'test' CHECK (mode IN ('test', 'practice'));

-- =============================================
-- ENABLE RLS ON NEW TABLES
-- =============================================

ALTER TABLE public.daily_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR daily_tests
-- =============================================

-- Students/Teachers can view daily tests for their coaching
CREATE POLICY "Users can view daily tests for their coaching"
  ON public.daily_tests FOR SELECT
  USING (coaching_id = get_user_coaching_id());

-- Only system can insert daily tests (we'll use service role or trigger)
-- For now, allow authenticated users to insert for their coaching
CREATE POLICY "Users can insert daily tests for their coaching"
  ON public.daily_tests FOR INSERT
  WITH CHECK (coaching_id = get_user_coaching_id());

-- =============================================
-- RLS POLICIES FOR daily_test_attempts
-- =============================================

CREATE POLICY "Users can view their own test attempts"
  ON public.daily_test_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own test attempts"
  ON public.daily_test_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view test attempts of their coaching students"
  ON public.daily_test_attempts FOR SELECT
  USING (is_teacher_of_coaching(coaching_id));

-- =============================================
-- RLS POLICIES FOR practice_attempts
-- =============================================

CREATE POLICY "Users can view their own practice attempts"
  ON public.practice_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own practice attempts"
  ON public.practice_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view practice attempts of their coaching students"
  ON public.practice_attempts FOR SELECT
  USING (is_teacher_of_coaching(coaching_id));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_daily_tests_coaching_date ON public.daily_tests(coaching_id, test_date);
CREATE INDEX idx_daily_test_attempts_user_date ON public.daily_test_attempts(user_id, test_date);
CREATE INDEX idx_practice_attempts_user_date ON public.practice_attempts(user_id, attempt_date);
CREATE INDEX idx_mcq_wrong_answers_mode ON public.mcq_wrong_answers(mode);

-- =============================================
-- ENABLE REALTIME FOR NEW TABLES
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_test_attempts;