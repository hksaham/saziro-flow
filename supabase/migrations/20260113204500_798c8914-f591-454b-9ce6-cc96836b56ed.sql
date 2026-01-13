-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.get_current_week_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT to_char(CURRENT_DATE, 'IYYY-IW');
$$;

CREATE OR REPLACE FUNCTION public.get_current_month_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT to_char(CURRENT_DATE, 'YYYY-MM');
$$;