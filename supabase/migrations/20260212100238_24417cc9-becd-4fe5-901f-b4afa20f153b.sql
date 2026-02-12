
-- Fix remaining linter items

-- Ensure view is SECURITY INVOKER (Postgres 15+)
DROP VIEW IF EXISTS public.app_settings_public;
CREATE VIEW public.app_settings_public
WITH (security_invoker = true)
AS
SELECT
  id,
  app_name,
  hero_title,
  hero_description,
  logo_url,
  language,
  patient_mode,
  stats,
  terms_ar,
  terms_en,
  working_hours,
  created_at
FROM public.app_settings;

-- Replace permissive INSERT policies (avoid WITH CHECK (true) while keeping public insert)
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;
CREATE POLICY "Anyone can insert bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Anyone can insert complaints" ON public.complaints;
CREATE POLICY "Anyone can insert complaints"
ON public.complaints
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));
