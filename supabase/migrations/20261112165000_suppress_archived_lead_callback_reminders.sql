-- Prevent archived leads from generating or receiving callback reminders.
-- Avoid PL/pgSQL OUT parameter ambiguity in ON CONFLICT index inference.
-- Unique(source_kind,source_id,due_at,stage,device_id) still guarantees idempotency.
create or replace function public.crm_claim_callback_reminders(p_limit integer default 20)
returns table(id uuid,device_id uuid,staff_email text,endpoint text,p256dh text,auth_key text,
 lead_id uuid,conversation_id uuid,stage text,due_at timestamptz)
language plpgsql security definer set search_path to ''
as $fn$
begin
 if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
 -- Delete only undelivered obsolete reminders, never historical delivery records.
 delete from public.crm_callback_reminder_queue q
 where q.delivered_at is null and
 ( (q.source_kind='lead_followup' and not exists (
    select 1 from public.lead_followups f where f.id=q.source_id and f.status='active' and f.due_at=q.due_at and exists (select 1 from public.leads l where l.id=f.lead_id and l.status<>'archived')
   ))
  or (q.source_kind='conversation_followup' and not exists (
    select 1 from public.ai_concierge_tasks t
    join public.ai_concierge_handoff_outcomes o on o.task_id=t.id
    where t.id=q.source_id and t.status in ('pending','claimed') and t.due_at=q.due_at
      and o.disposition='follow_up' and o.followup_at=q.due_at
      and (c.lead_id is null or exists (select 1 from public.leads l where l.id=c.lead_id and l.status<>'archived'))
      and o.id=(select latest.id from public.ai_concierge_handoff_outcomes latest
       where latest.task_id=t.id order by latest.created_at desc limit 1)
   ))
   or exists(select 1 from public.crm_notification_preferences pref
     where pref.staff_email=q.staff_email and pref.callback_reminders_enabled=false)
 );

 with source as (
  select 'lead_followup'::text kind,f.id source_id,f.due_at,f.created_at scheduled_at,
     f.lead_id,null::uuid conversation_id
  from public.lead_followups f join public.leads l on l.id=f.lead_id and l.status<>'archived' where f.status='active' and f.due_at>now()-interval '1 hour'
  union all
  select 'conversation_followup'::text kind,t.id,t.due_at,o.created_at,c.lead_id,t.conversation_id
  from public.ai_concierge_tasks t
  join public.ai_conversations c on c.id=t.conversation_id
  left join public.leads linked_lead on linked_lead.id=c.lead_id
  join lateral (
   select disposition,followup_at,created_at from public.ai_concierge_handoff_outcomes
   where task_id=t.id order by created_at desc limit 1
  ) o on true
  where (c.lead_id is null or linked_lead.status<>'archived') and t.status in ('pending','claimed') and o.disposition='follow_up'
   and o.followup_at=t.due_at and t.due_at>now()-interval '1 hour'
 ), milestones as (
  select s.*,m.stage
  from source s cross join lateral
   (values ('scheduled'::text,s.scheduled_at),
           ('before_15'::text,s.due_at-interval '15 minutes'),
           ('due'::text,s.due_at),
           ('overdue_15'::text,s.due_at+interval '15 minutes')) m(stage,fire_at)
  where m.fire_at<=now() and m.fire_at>now()-interval '2 minutes'
   and (m.stage<>'scheduled' or s.due_at>now())
 )
 insert into public.crm_callback_reminder_queue
   (source_kind,source_id,due_at,stage,device_id,staff_email,lead_id,conversation_id)
 select m.kind,m.source_id,m.due_at,m.stage,d.id,d.staff_email,m.lead_id,m.conversation_id
 from milestones m
 join public.ai_concierge_push_subscriptions d on
  d.staff_email in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com')
 left join public.crm_notification_preferences pref on pref.staff_email=d.staff_email
 where coalesce(pref.callback_reminders_enabled,true)
 on conflict do nothing;

 return query
 with picked as (
  select q.id from public.crm_callback_reminder_queue q
  where q.delivered_at is null and q.next_attempt_at<=now()
   and (q.claimed_until is null or q.claimed_until<now()) and q.attempts<6
  order by q.created_at limit least(greatest(p_limit,1),50) for update skip locked
 ), claimed as (
  update public.crm_callback_reminder_queue q set
   attempts=q.attempts+1,claimed_until=now()+interval '2 minutes'
  from picked p where q.id=p.id returning q.*
 )
 select q.id,q.device_id,q.staff_email,d.endpoint,d.p256dh,d.auth_key,
  q.lead_id,q.conversation_id,q.stage,q.due_at
 from claimed q join public.ai_concierge_push_subscriptions d on d.id=q.device_id
 left join public.crm_notification_preferences pref on pref.staff_email=q.staff_email
 where coalesce(pref.callback_reminders_enabled,true)
 and (q.lead_id is null or exists (select 1 from public.leads l where l.id=q.lead_id and l.status<>'archived'));
end
$fn$;
