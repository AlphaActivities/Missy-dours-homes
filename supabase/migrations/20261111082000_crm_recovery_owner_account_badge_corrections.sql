-- Owner-only account metadata, opt-in badge corrections after verified customer consolidation.
-- No plaintext password access or credential storage.
CREATE OR REPLACE FUNCTION public.missy_owner_staff_account_snapshot()
RETURNS TABLE(email text,created_at timestamptz,email_confirmed_at timestamptz,last_sign_in_at timestamptz,account_enabled boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM auth.users owner WHERE owner.id=auth.uid()
   AND lower(owner.email)='yourcustomerflowguy@gmail.com'
 ) THEN RAISE EXCEPTION 'Owner only'; END IF;
 RETURN QUERY
 SELECT approved.email,u.created_at,u.email_confirmed_at,u.last_sign_in_at,(u.id IS NOT NULL)
 FROM (VALUES ('yourcustomerflowguy@gmail.com'),('missydourshomes@gmail.com'),('heberherrera92@gmail.com')) approved(email)
 LEFT JOIN auth.users u ON lower(u.email)=approved.email ORDER BY approved.email;
END $fn$;
REVOKE ALL ON FUNCTION public.missy_owner_staff_account_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.missy_owner_staff_account_snapshot() TO authenticated;

ALTER TABLE public.crm_notification_preferences
 ADD COLUMN IF NOT EXISTS badge_correction_enabled boolean NOT NULL DEFAULT false;

-- One coalesced correction candidate per opted-in staff account.
CREATE TABLE IF NOT EXISTS public.crm_badge_correction_queue(
 staff_email text PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 not_before timestamptz NOT NULL DEFAULT now()+interval '60 seconds',
 claimed_until timestamptz,
 processed_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 last_error_code text
);
CREATE TABLE IF NOT EXISTS public.crm_badge_device_state(
 device_id uuid PRIMARY KEY REFERENCES public.ai_concierge_push_subscriptions(id) ON DELETE CASCADE,
 staff_email text NOT NULL,
 last_badge_count integer NOT NULL CHECK(last_badge_count>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_badge_correction_pending_idx
 ON public.crm_badge_correction_queue(not_before) WHERE processed_at IS NULL;
ALTER TABLE public.crm_badge_correction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_badge_device_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_badge_correction_queue, public.crm_badge_device_state FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.crm_badge_correction_queue, public.crm_badge_device_state TO service_role;

-- Trigger fires on a verified consolidation only, not on page visits or time-based polling.
CREATE OR REPLACE FUNCTION public.crm_schedule_badge_correction_after_consolidation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 INSERT INTO public.crm_badge_correction_queue(staff_email,created_at,not_before,processed_at,claimed_until,attempts,last_error_code)
 SELECT p.staff_email,now(),now()+interval '60 seconds',null,null,0,null
 FROM public.crm_notification_preferences p
 WHERE p.badge_correction_enabled=true
  AND EXISTS(SELECT 1 FROM public.ai_concierge_push_subscriptions d WHERE lower(d.staff_email)=lower(p.staff_email))
 ON CONFLICT(staff_email) DO UPDATE SET
  created_at=now(),not_before=now()+interval '60 seconds',processed_at=null,
  claimed_until=null,attempts=0,last_error_code=null;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.crm_schedule_badge_correction_after_consolidation() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS crm_consolidation_badge_correction ON public.crm_lead_consolidations;
CREATE CONSTRAINT TRIGGER crm_consolidation_badge_correction
 AFTER INSERT ON public.crm_lead_consolidations
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
 EXECUTE FUNCTION public.crm_schedule_badge_correction_after_consolidation();

CREATE OR REPLACE FUNCTION public.crm_claim_badge_corrections(p_limit integer DEFAULT 10)
RETURNS TABLE(staff_email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 IF coalesce(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'Service only'; END IF;
 RETURN QUERY WITH candidate AS (
  SELECT q.staff_email FROM public.crm_badge_correction_queue q
  WHERE q.processed_at IS NULL AND q.not_before<=now()
   AND (q.claimed_until IS NULL OR q.claimed_until<now())
  ORDER BY q.not_before LIMIT least(greatest(p_limit,1),20) FOR UPDATE SKIP LOCKED
 ), updated AS (
  UPDATE public.crm_badge_correction_queue q SET claimed_until=now()+interval '2 minutes',attempts=q.attempts+1
  FROM candidate c WHERE q.staff_email=c.staff_email RETURNING q.staff_email
 ) SELECT updated.staff_email FROM updated;
END $fn$;
REVOKE ALL ON FUNCTION public.crm_claim_badge_corrections(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_claim_badge_corrections(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.crm_finish_badge_correction(p_staff_email text,p_success boolean,p_error_code text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 IF coalesce(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'Service only'; END IF;
 UPDATE public.crm_badge_correction_queue
 SET processed_at=CASE WHEN p_success THEN now() ELSE NULL END,
     not_before=CASE WHEN p_success THEN not_before ELSE now()+interval '5 minutes' END,
     claimed_until=null,last_error_code=left(p_error_code,80)
 WHERE staff_email=p_staff_email;
END $fn$;
REVOKE ALL ON FUNCTION public.crm_finish_badge_correction(text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_finish_badge_correction(text,boolean,text) TO service_role;
