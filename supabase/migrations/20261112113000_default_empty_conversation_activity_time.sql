-- Empty conversations still have a real activity time: their creation.
-- This preserves the existing newest-first pagination and keeps empty sessions
-- from falling behind older conversations solely because no message was sent.
UPDATE public.ai_conversations
SET last_message_at = started_at
WHERE last_message_at IS NULL AND started_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.crm_default_conversation_activity_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.last_message_at IS NULL THEN
    NEW.last_message_at := COALESCE(NEW.started_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_default_conversation_activity_time_insert
ON public.ai_conversations;

CREATE TRIGGER crm_default_conversation_activity_time_insert
BEFORE INSERT ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.crm_default_conversation_activity_time();
