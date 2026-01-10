-- Drop existing problematic policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view students in their coaching" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can update students in their coaching" ON public.profiles;

-- Create a security definer function to get user_id from auth safely
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- Create a security definer function to check if user is a teacher of a coaching
CREATE OR REPLACE FUNCTION public.is_teacher_of_coaching(p_coaching_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'teacher'
      AND coaching_id = p_coaching_id
  )
$$;

-- Create a security definer function to get user's coaching_id
CREATE OR REPLACE FUNCTION public.get_my_coaching_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coaching_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Recreate policies using auth.uid() directly (no subquery on same table)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Teachers can view students in their coaching using security definer function
CREATE POLICY "Teachers can view students in their coaching"
ON public.profiles
FOR SELECT
USING (
  public.is_teacher_of_coaching(coaching_id)
);

-- Teachers can update students in their coaching using security definer function
CREATE POLICY "Teachers can update students in their coaching"
ON public.profiles
FOR UPDATE
USING (
  public.is_teacher_of_coaching(coaching_id)
);