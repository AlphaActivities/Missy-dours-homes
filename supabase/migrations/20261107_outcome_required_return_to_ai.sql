-- Returning control to AI is not proof a customer request was resolved.
create table if not exists public.ai_concierge_handoff_outcomes (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
 task_id uuid references public.ai_concierge_tasks(id) on delete set null,
 staff_email text not null,
 disposition text not null check(disposition in ('resolved','follow_up')),
 notes text not null check(length(notes) between 10 and 1000),
 followup_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.ai_concierge_handoff_outcomes enable row level security;
revoke all on public.ai_concierge_handoff_outcomes from anon,authenticated;
grant select on public.ai_concierge_handoff_outcomes to authenticated;
drop policy if exists "approved staff view handoff outcomes" on public.ai_concierge_handoff_outcomes;
create policy "approved staff view handoff outcomes" on public.ai_concierge_handoff_outcomes
 for select to authenticated using (
 lower(coalesce(auth.jwt()->>'email',''))=any(array[
  'missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'
 ])
);
create index if not exists ai_handoff_outcomes_conversation_date_idx
 on public.ai_concierge_handoff_outcomes(conversation_id,created_at desc);

CREATE OR REPLACE FUNCTION public.ai_concierge_return_to_ai(p_conversation uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare me text:=lower(coalesce(auth.jwt()->>'email',''));
begin
 if me not in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com')
 then return false; end if;
 update public.ai_conversations set status='ai',assigned_to=null,updated_at=now()
 where id=p_conversation and status='human' and assigned_to=me;
 if not found then return false; end if;
 update public.ai_concierge_tasks set status='pending',assigned_to=null,updated_at=now()
 where conversation_id=p_conversation and status='claimed';
 return true;
end $function$;

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
 insert into public.ai_concierge_handoff_outcomes(conversation_id,task_id,staff_email,disposition,notes,followup_at)
 values(p_conversation,active_task,staff,p_disposition,btrim(p_notes),
  case when p_disposition='follow_up' then p_followup_at else null end);
 return true;
end $function$;

revoke all on function public.crm_return_chat_to_ai_with_outcome(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.crm_return_chat_to_ai_with_outcome(uuid,text,text,timestamptz) to authenticated;
