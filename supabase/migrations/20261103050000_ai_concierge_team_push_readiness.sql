-- Expose only a staff member's own team readiness summary, never device
-- endpoints or encryption keys. Feature flags and delivery remain unchanged.
CREATE OR REPLACE FUNCTION public.ai_concierge_team_push_readiness()
RETURNS TABLE(staff_name text, device_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
BEGIN
  IF auth.uid() IS NULL OR v_email NOT IN
    ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com')
  THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  WITH team(name,email) AS (
    VALUES ('Missy'::text,'missydourshomes@gmail.com'::text),
           ('Josh'::text,'yourcustomerflowguy@gmail.com'::text),
           ('Heber'::text,'heberherrera92@gmail.com'::text)
  )
  SELECT team.name, count(p.id)::bigint
  FROM team
  LEFT JOIN public.ai_concierge_push_subscriptions AS p
    ON lower(p.staff_email)=team.email
  GROUP BY team.name
  ORDER BY CASE team.name WHEN 'Missy' THEN 1 WHEN 'Josh' THEN 2 ELSE 3 END;
END;
$function$;
REVOKE ALL ON FUNCTION public.ai_concierge_team_push_readiness() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ai_concierge_team_push_readiness() TO authenticated,service_role;
