
-- Fix 1: Remove public read access to contracting_companies (staff already has ALL access)
DROP POLICY IF EXISTS "Public read contracting_companies" ON public.contracting_companies;

-- Fix 2: Remove public read access to app_settings base table
-- The app_settings_public view already exists for any public needs
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;

-- Add staff-only SELECT policy for app_settings (the existing Staff manage policy uses ALL which covers SELECT for staff)
-- No additional policy needed since "Staff manage app_settings" already grants ALL to staff
