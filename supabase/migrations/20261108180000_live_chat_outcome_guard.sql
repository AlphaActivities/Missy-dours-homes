-- Different safety requirements for live chat and consented callbacks.
-- No tasks or customer records are resolved by this migration.
CREATE OR REPLACE FUNCTION public.crm_guard_callback_task_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_lead uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT c.lead_id INTO v_lead FROM public.ai_conversations c WHERE c.id=NEW.conversation_id;
    -- Live chat can be resolved by the assigned staff member's recorded
    -- disposition. Consent-based callbacks still demand verified contact.
    IF NEW.request_kind='live_chat' AND EXISTS(
      SELECT 1 FROM public.ai_concierge_handoff_outcomes o
      WHERE o.task_id=NEW.id AND o.disposition='resolved'
       AND o.created_at>=NEW.created_at AND o.created_at>=now()-interval '10 minutes'
       AND lower(o.staff_email)=lower(coalesce(auth.jwt()->>'email',''))
    ) THEN
      NULL;
    ELSIF v_lead IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.lead_contact_events e
      WHERE e.lead_id=v_lead AND e.resolved_callback=true
        AND e.outcome IN ('spoke','replied')
        AND e.created_at >= NEW.created_at
        AND e.created_at >= now() - interval '10 minutes'
        AND lower(coalesce(e.contacted_by,''))=lower(coalesce(auth.jwt()->>'email',''))
    ) THEN
      RAISE EXCEPTION 'Record a confirmed call, text, or email outcome in the linked lead before resolving this callback';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.crm_return_chat_to_ai_with_outcome(p_conversation uuid, p_disposition text, p_notes text, p_followup_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 staff text:=lower(coalesce(auth.jwt()->>'email',''));
 active_task uuid;
begin
 if staff not in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com')
 then raise exception 'Not authorized'; end if;
 if p_disposition not in ('resolved','follow_up') or length(btrim(coalesce(p_notes,''))) not between 10 and 1000
 then raise exception 'Record a valid outcome with at least 10 characters of notes'; end if;
 if p_disposition='follow_up' and (p_followup_at is null or p_followup_at<=now() or p_followup_at>now()+interval '365 days')
 then raise exception 'Choose a future follow-up date'; end if;
 update public.ai_conversations set status='ai',assigned_to=null,updated_at=now()
 where id=p_conversation and status='human' and assigned_to=staff;
 if not found then return false; end if;
 select id into active_task from public.ai_concierge_tasks
 where conversation_id=p_conversation and status in ('pending','claimed')
 order by created_at desc limit 1 for update;
 -- Persist the disposition before task completion so the guard can prove
 -- a real staff record exists in the same transaction.
 insert into public.ai_concierge_handoff_outcomes(conversation_id,task_id,staff_email,disposition,notes,followup_at)
 values(p_conversation,active_task,staff,p_disposition,btrim(p_notes),
  case when p_disposition='follow_up' then p_followup_at else null end);
 if p_disposition='resolved' then
  update public.ai_concierge_tasks set status='completed',completed_at=now(),
   updated_at=now() where conversation_id=p_conversation and status in ('pending','claimed');
  if active_task is not null then
   insert into public.crm_activity_events(event_key,category,title,summary,target_path)
   values('staff:completed:'||active_task,'staff','Follow-up Completed',
    'Team recorded a resolved chat request',
    '/dashboard/conversations?conversation='||p_conversation)
   on conflict(event_key) do nothing;
  end if;
 else
  update public.ai_concierge_tasks set status='pending',assigned_to=null,
   due_at=p_followup_at,escalation_due_at=p_followup_at+interval '30 minutes',
   escalated_at=null,updated_at=now()
   where conversation_id=p_conversation and status in ('pending','claimed');
 end if;

 return true;
end $function$;
