-- Count each actionable customer request once in the CRM attention badge.
-- One handoff creates BOTH a pending ai_concierge_tasks record and a
-- waiting_human ai_conversations record for the same conversation_id.
-- Both are genuine records and must remain intact, but are one item of work.
-- Keep the breakdown of raw task and waiting-conversation counts for diagnostics.
-- Preserve the original authorized-staff guard and secure function grants.

CREATE OR REPLACE FUNCTION public.crm_attention_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  staff text := lower(coalesce(auth.jwt()->>'email',''));
  new_count integer;
  tasks_count integer;
  waiting_count integer;
  uncovered_waiting_count integer;
BEGIN
  IF staff NOT IN ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(*)::integer INTO new_count
  FROM public.leads WHERE status = 'new';

  SELECT count(*)::integer INTO tasks_count
  FROM public.ai_concierge_tasks WHERE status IN ('pending','claimed');

  SELECT count(*)::integer, count(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ai_concierge_tasks t
      WHERE t.conversation_id = c.id AND t.status IN ('pending','claimed')
    )
  )::integer INTO waiting_count, uncovered_waiting_count
  FROM public.ai_conversations c
  WHERE c.status = 'waiting_human';

  RETURN jsonb_build_object(
    'new_leads', new_count,
    'open_tasks', tasks_count,
    'waiting_conversations', waiting_count,
    'waiting_conversations_without_task', uncovered_waiting_count,
    'attention_count', new_count + tasks_count + uncovered_waiting_count
  );
END
$function$;

REVOKE ALL ON FUNCTION public.crm_attention_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_attention_summary() TO authenticated;
