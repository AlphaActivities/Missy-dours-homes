-- Production hotfix: callback reminder worker previously returned SQLSTATE 42P01.
-- The obsolete conversation follow-up cleanup referenced c.lead_id without joining c.
-- Preserve the rest of the live function definition, including its security and grants.
DO $fix$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.crm_claim_callback_reminders(integer)'::regprocedure) INTO definition;
 IF position('join public.ai_concierge_handoff_outcomes o on o.task_id=t.id join public.ai_conversations c on c.id=t.conversation_id' in definition)>0 THEN
  RETURN;
 END IF;
 IF position('join public.ai_concierge_handoff_outcomes o on o.task_id=t.id' in definition)=0
 OR position('and (c.lead_id is null or exists' in definition)=0 THEN
  RAISE EXCEPTION 'Unexpected callback reminder function definition; refusing patch';
 END IF;
 definition:=replace(definition,
 'join public.ai_concierge_handoff_outcomes o on o.task_id=t.id',
 'join public.ai_concierge_handoff_outcomes o on o.task_id=t.id join public.ai_conversations c on c.id=t.conversation_id');
 EXECUTE definition;
END
$fix$;
