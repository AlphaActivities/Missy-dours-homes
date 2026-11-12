-- Keep conversation ordering tied to actual saved message activity, not stale metadata.
-- Backfill historical rows, including older conversations whose last_message_at
-- was never updated after visitor or staff messages were saved.
UPDATE public.ai_conversations AS c
SET last_message_at = latest.latest_at
FROM (
  SELECT conversation_id, MAX(created_at) AS latest_at
  FROM public.ai_conversation_messages
  GROUP BY conversation_id
) AS latest
WHERE c.id = latest.conversation_id
  AND (c.last_message_at IS NULL OR c.last_message_at < latest.latest_at);

CREATE OR REPLACE FUNCTION public.crm_sync_conversation_latest_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.ai_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id
    AND (last_message_at IS NULL OR last_message_at < NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_sync_conversation_latest_message_insert
ON public.ai_conversation_messages;

CREATE TRIGGER crm_sync_conversation_latest_message_insert
AFTER INSERT ON public.ai_conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.crm_sync_conversation_latest_message();
