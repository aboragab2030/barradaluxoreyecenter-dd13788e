
-- Fix linter: function search_path + stable where applicable
CREATE OR REPLACE FUNCTION public.get_bookings_by_phone(phone_number TEXT)
RETURNS TABLE (
  booking_id UUID,
  doctor_name TEXT,
  service TEXT,
  booking_date TEXT,
  booking_time TEXT,
  booking_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.doctor_name, b.service, b.date, b.time, b.status, b.created_at
  FROM public.bookings b
  WHERE b.phone = phone_number OR b.phone2 = phone_number
  ORDER BY b.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_by_login_username(p_login_username TEXT)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.login_username = p_login_username AND p.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  );
END;
$$;

-- Fix linter: remove security definer view by recreating as regular view
DROP VIEW IF EXISTS public.app_settings_public;
CREATE VIEW public.app_settings_public AS
SELECT id, app_name, hero_title, hero_description, logo_url, language, patient_mode, stats, terms_ar, terms_en, working_hours, created_at
FROM public.app_settings;

-- Fix linter: tighten overly permissive policies
-- Bookings: keep public insert, but only authenticated staff can read
DROP POLICY IF EXISTS "Staff can read all bookings" ON public.bookings;
CREATE POLICY "Staff can read all bookings" ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

-- Payments: staff-only instead of true
DROP POLICY IF EXISTS "Staff full access payments" ON public.payments;
CREATE POLICY "Staff full access payments" ON public.payments
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Payment notifications: staff-only
DROP POLICY IF EXISTS "Staff full access payment_notifications" ON public.payment_notifications;
CREATE POLICY "Staff full access payment_notifications" ON public.payment_notifications
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- App notifications: staff-only (or per-user); keep staff-only for parity
DROP POLICY IF EXISTS "Staff full access app_notifications" ON public.app_notifications;
CREATE POLICY "Staff full access app_notifications" ON public.app_notifications
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Profiles: staff-only
DROP POLICY IF EXISTS "Staff full access profiles" ON public.profiles;
CREATE POLICY "Staff full access profiles" ON public.profiles
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- User roles: admin-only ideally, but keep staff-only access restricted (no public)
DROP POLICY IF EXISTS "Staff full access user_roles" ON public.user_roles;
CREATE POLICY "Staff full access user_roles" ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
