
-- Fix 1: Add authentication check to get_bookings_by_phone RPC
CREATE OR REPLACE FUNCTION public.get_bookings_by_phone(phone_number text)
 RETURNS TABLE(booking_id uuid, doctor_name text, service text, booking_date text, booking_time text, booking_status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authenticated staff/admin
  IF NOT is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: staff or admin role required';
  END IF;

  RETURN QUERY
  SELECT b.id, b.doctor_name, b.service, b.date, b.time, b.status, b.created_at
  FROM public.bookings b
  WHERE b.phone = phone_number OR b.phone2 = phone_number
  ORDER BY b.created_at DESC;
END;
$function$;

-- Fix 2: Add unique constraint on profiles.user_id
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Fix 3: Add unique constraint on user_roles (user_id, role)  
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);
