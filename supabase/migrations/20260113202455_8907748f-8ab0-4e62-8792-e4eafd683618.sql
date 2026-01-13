-- Add student metadata columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_class TEXT,
ADD COLUMN IF NOT EXISTS board TEXT,
ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'chill-bro';

-- Add check constraint for valid class values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_student_class CHECK (
  student_class IS NULL OR student_class IN ('class-9', 'class-10', 'old-10')
);

-- Add check constraint for valid board values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_board CHECK (
  board IS NULL OR board IN ('dhaka', 'chattogram', 'rajshahi', 'cumilla', 'jessore', 'sylhet', 'dinajpur', 'madrasah', 'technical')
);

-- Add check constraint for valid tone values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_tone CHECK (
  tone IS NULL OR tone IN ('chill-bro', 'friendly-banglish', 'formal-bangla')
);