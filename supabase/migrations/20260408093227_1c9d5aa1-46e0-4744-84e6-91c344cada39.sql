CREATE OR REPLACE FUNCTION public.get_user_by_login_username(p_login_username text)
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.user_id, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.login_username = p_login_username AND p.is_active = true;
END;
$function$;