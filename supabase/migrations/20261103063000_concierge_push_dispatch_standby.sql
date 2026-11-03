-- Concierge push dispatcher in standby mode; never sends until independently enabled.
-- The worker remains protected by MISSY_PUSH_DELIVERY_ENABLED and a separate secret.
CREATE SCHEMA IF NOT EXISTS concierge_private;
REVOKE ALL ON SCHEMA concierge_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS concierge_private.push_dispatch_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON concierge_private.push_dispatch_state FROM PUBLIC,anon,authenticated;
INSERT INTO concierge_private.push_dispatch_state(id,enabled)
VALUES(true,false) ON CONFLICT(id) DO NOTHING;

DO $secret$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='missy_concierge_sender_secret') THEN
  PERFORM vault.create_secret(
   encode(extensions.gen_random_bytes(32),'hex'),
   'missy_concierge_sender_secret',
   'Server-only credential for disabled-by-default Missy Concierge push dispatcher'
  );
 END IF;
END
$secret$;

CREATE OR REPLACE FUNCTION public.ai_concierge_get_sender_secret()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $getter$
 SELECT decrypted_secret::text
 FROM vault.decrypted_secrets
 WHERE name='missy_concierge_sender_secret'
 LIMIT 1;
$getter$;
REVOKE ALL ON FUNCTION public.ai_concierge_get_sender_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai_concierge_get_sender_secret() TO service_role;

-- This function has no public or authenticated execution permission.
-- It is invoked by trusted PostgreSQL pg_cron only and returns immediately
-- while the private enabled switch is false. It does not alter customer records.
CREATE OR REPLACE FUNCTION concierge_private.dispatch_pending_pushes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
 is_enabled boolean;
 dispatch_secret text;
 request_id bigint;
BEGIN
 SELECT enabled INTO is_enabled FROM concierge_private.push_dispatch_state WHERE id=true;
 IF is_enabled IS DISTINCT FROM true THEN RETURN; END IF;
 SELECT decrypted_secret INTO dispatch_secret
 FROM vault.decrypted_secrets
 WHERE name='missy_concierge_sender_secret'
 LIMIT 1;
 IF dispatch_secret IS NULL THEN RAISE WARNING 'Concierge dispatch credential missing'; RETURN; END IF;
 SELECT net.http_post(
   url:='https://ddgpsvkmrnfeufepowog.supabase.co/functions/v1/concierge-push-delivery',
   headers:=jsonb_build_object('Content-Type','application/json',
     'Authorization','Bearer '||dispatch_secret),
   body:='{}'::jsonb,
   timeout_milliseconds:=8000
 ) INTO request_id;
END;
$function$;
REVOKE ALL ON FUNCTION concierge_private.dispatch_pending_pushes() FROM PUBLIC,anon,authenticated;
-- The scheduler is registered, but dispatch_pending_pushes() does no network
-- requests until the independent private DB switch is intentionally enabled.
SELECT cron.schedule(
 'missy-concierge-push-delivery',
 '* * * * *',
 'SELECT concierge_private.dispatch_pending_pushes();'
);
