-- Only a Missy-owned handoff generates the staff transfer notification.
-- The existing initial and escalation events retain their original behavior.
ALTER TABLE public.ai_concierge_push_outbox
  DROP CONSTRAINT ai_concierge_push_outbox_event_type_check;
ALTER TABLE public.ai_concierge_push_outbox
  ADD CONSTRAINT ai_concierge_push_outbox_event_type_check
  CHECK (event_type IN ('handoff_created','handoff_escalated','handoff_claimed'));

CREATE OR REPLACE FUNCTION public.ai_concierge_queue_missy_claim()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_task uuid;
BEGIN
 IF NEW.status='human' AND NEW.assigned_to='missydourshomes@gmail.com'
    AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
   SELECT id INTO v_task FROM public.ai_concierge_tasks
   WHERE conversation_id=NEW.id AND task_type='human_handoff'
   ORDER BY created_at DESC LIMIT 1;
   IF v_task IS NOT NULL THEN
     INSERT INTO public.ai_concierge_push_outbox(task_id,event_type)
       VALUES(v_task,'handoff_claimed') ON CONFLICT DO NOTHING;
   END IF;
 END IF;
 RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.ai_concierge_queue_missy_claim() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai_concierge_queue_missy_claim() TO service_role;
DROP TRIGGER IF EXISTS ai_concierge_missy_claim_notice ON public.ai_conversations;
CREATE TRIGGER ai_concierge_missy_claim_notice
AFTER UPDATE OF status,assigned_to ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.ai_concierge_queue_missy_claim();
