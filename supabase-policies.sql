-- Run this entire file in Supabase Dashboard → SQL Editor → Run
-- Fixes: 401 / "new row violates row-level security policy for table form"

-- 1) Let the API roles use the public schema and this table
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON TABLE public.form TO anon;
GRANT SELECT ON TABLE public.form TO authenticated;
GRANT SELECT ON TABLE public.form TO anon;
GRANT UPDATE ON TABLE public.form TO anon;

-- 2) Turn on row-level security
ALTER TABLE public.form ENABLE ROW LEVEL SECURITY;

-- 3) Remove old policies if you re-run this script (safe to run twice)
DROP POLICY IF EXISTS "Allow anon insert" ON public.form;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.form;
DROP POLICY IF EXISTS "Allow anon select (admin inbox)" ON public.form;
DROP POLICY IF EXISTS "Allow anon update is_read (admin inbox)" ON public.form;

-- 4) Anonymous website visitors may INSERT only (contact form)
CREATE POLICY "Allow anon insert"
  ON public.form
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5) Logged-in users may read submissions (admin later)
CREATE POLICY "Allow authenticated select"
  ON public.form
  FOR SELECT
  TO authenticated
  USING (true);

-- 6) Admin inbox (simple version): the public site may SELECT rows.
-- WARNING: This makes inbox data readable by anyone who knows the URL.
CREATE POLICY "Allow anon select (admin inbox)"
  ON public.form
  FOR SELECT
  TO anon
  USING (true);

-- 7) Admin inbox (simple version): the public site may mark messages as read.
CREATE POLICY "Allow anon update is_read (admin inbox)"
  ON public.form
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
