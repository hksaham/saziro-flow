-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('teacher', 'student');

-- Create enum for student status
CREATE TYPE public.student_status AS ENUM ('pending', 'approved', 'rejected');

-- Create coachings table (each teacher can have one coaching center)
CREATE TABLE public.coachings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID NOT NULL,
  invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  coaching_id UUID REFERENCES public.coachings(id) ON DELETE CASCADE,
  student_status student_status DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.coachings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is teacher of a coaching
CREATE OR REPLACE FUNCTION public.is_coaching_teacher(coaching_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'teacher'
    AND coaching_id = coaching_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Create function to get user's coaching_id
CREATE OR REPLACE FUNCTION public.get_user_coaching_id()
RETURNS UUID AS $$
  SELECT coaching_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Create function to check if user is approved student or teacher
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND (
      role = 'teacher' 
      OR (role = 'student' AND student_status = 'approved')
    )
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- RLS Policies for coachings
CREATE POLICY "Teachers can view their own coaching"
ON public.coachings FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their coaching"
ON public.coachings FOR INSERT
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their coaching"
ON public.coachings FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Anyone can view coaching by invite token"
ON public.coachings FOR SELECT
USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Teachers can view students in their coaching"
ON public.profiles FOR SELECT
USING (
  coaching_id = public.get_user_coaching_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'teacher'
  )
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Teachers can update students in their coaching"
ON public.profiles FOR UPDATE
USING (
  coaching_id = public.get_user_coaching_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'teacher'
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_coachings_updated_at
BEFORE UPDATE ON public.coachings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();