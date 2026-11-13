-- Persist visitor-engagement push events as informational CRM history, not actionable inbox items.
-- Event key is deterministic; replay/backfill cannot duplicate a conversation.
CREATE OR REPLACE FUNCTION public.crm_record_visitor_engagement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF NEW.event_type = 'visitor_engaged' AND NEW.conversation_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_events(event_key,category,title,summary,target_path,created_at)
    VALUES ('visitor:' || NEW.conversation_id::text, 'staff',
            'Visitor Chat Started',
            'A verified visitor began composing a chatbot message. Open the conversation to review.',
            '/dashboard/conversations?conversation=' || NEW.conversation_id::text,
            NEW.created_at)
    ON CONFLICT (event_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.crm_record_visitor_engagement() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS crm_record_visitor_engagement_push ON public.ai_concierge_push_outbox;
CREATE TRIGGER crm_record_visitor_engagement_push
AFTER INSERT ON public.ai_concierge_push_outbox
FOR EACH ROW EXECUTE FUNCTION public.crm_record_visitor_engagement();

INSERT INTO public.crm_activity_events(event_key,category,title,summary,target_path,created_at)
SELECT 'visitor:' || conversation_id::text, 'staff',
       'Visitor Chat Started',
       'A verified visitor began composing a chatbot message. Open the conversation to review.',
       '/dashboard/conversations?conversation=' || conversation_id::text,
       min(created_at)
FROM public.ai_concierge_push_outbox
WHERE event_type = 'visitor_engaged' AND conversation_id IS NOT NULL
GROUP BY conversation_id
ON CONFLICT (event_key) DO NOTHING;

-- Keep informational history out of active/unread/badge totals.
-- Preserve the established grouped-count function's signature and staff authorization.
DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='crm_grouped_activity_counts';
  IF definition IS NULL OR position('(r.archived_at IS NULL AND' IN definition)=0
    OR position('(r.archived_at IS NOT NULL OR' IN definition)=0 THEN
    RAISE EXCEPTION 'Unexpected grouped activity function; migration requires review';
  END IF;
  definition := replace(definition, '(r.archived_at IS NULL AND',
                        '(e.event_key NOT LIKE ''visitor:%'' AND r.archived_at IS NULL AND');
  definition := replace(definition, '(r.archived_at IS NOT NULL OR',
                        '(e.event_key LIKE ''visitor:%'' OR r.archived_at IS NOT NULL OR');
  EXECUTE definition;
END $migration$;
