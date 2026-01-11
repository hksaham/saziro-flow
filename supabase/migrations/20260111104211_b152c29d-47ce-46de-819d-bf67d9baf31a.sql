-- Drop and recreate the is_teacher_of_coaching function with proper validation
-- This ensures teachers can ONLY see students from coaching sessions they own

CREATE OR REPLACE FUNCTION public.is_teacher_of_coaching(p_coaching_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coachings
    WHERE id = p_coaching_id
      AND teacher_id = auth.uid()
  )
$$;