-- Appointment reminders: separate from initial callback attention deadlines.
-- Only confirmed future follow-ups are eligible; no old test request is backfilled.
alter table public.crm_notification_preferences
 add column if not exists callback_reminders_enabled boolean not null default true;

create table if not exists public.crm_callback_reminder_queue (
 id uuid primary key default gen_random_uuid(),
 source_kind text not null check (source_kind in ('lead_followup','conversation_followup')),
 source_id uuid not null,
 due_at timestamptz not null,
 stage text not null check (stage in ('scheduled','before_15','due','overdue_15')),
 device_id uuid not null references public.ai_concierge_push_subscriptions(id) on delete cascade,
 staff_email text not null,
 lead_id uuid,
 conversation_id uuid,
 created_at timestamptz not null default now(),
 next_attempt_at timestamptz not null default now(),
 claimed_until timestamptz,
 attempts integer not null default 0,
 delivered_at timestamptz,
 last_error_code text,
 unique(source_kind,source_id,due_at,stage,device_id)
);
alter table public.crm_callback_reminder_queue enable row level security;
revoke all on public.crm_callback_reminder_queue from public,anon,authenticated;
grant select,insert,update,delete on public.crm_callback_reminder_queue to service_role;
create index if not exists crm_callback_reminder_pending_idx
 on public.crm_callback_reminder_queue(next_attempt_at) where delivered_at is null;

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
    select 1 from public.lead_followups f where f.id=q.source_id and f.status='active' and f.due_at=q.due_at
   ))
  or (q.source_kind='conversation_followup' and not exists (
    select 1 from public.ai_concierge_tasks t
    join public.ai_concierge_handoff_outcomes o on o.task_id=t.id
    where t.id=q.source_id and t.status in ('pending','claimed') and t.due_at=q.due_at
      and o.disposition='follow_up' and o.followup_at=q.due_at
   )));

 with source as (
  select 'lead_followup'::text kind,f.id source_id,f.due_at,f.created_at scheduled_at,
     f.lead_id,null::uuid conversation_id
  from public.lead_followups f where f.status='active' and f.due_at>now()-interval '1 hour'
  union all
  select 'conversation_followup'::text kind,t.id,t.due_at,o.created_at,c.lead_id,t.conversation_id
  from public.ai_concierge_tasks t
  join public.ai_conversations c on c.id=t.conversation_id
  join lateral (
   select disposition,followup_at,created_at from public.ai_concierge_handoff_outcomes
   where task_id=t.id order by created_at desc limit 1
  ) o on true
  where t.status in ('pending','claimed') and o.disposition='follow_up'
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
 on conflict(source_kind,source_id,due_at,stage,device_id) do nothing;

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
 where coalesce(pref.callback_reminders_enabled,true);
end
$fn$;
revoke all on function public.crm_claim_callback_reminders(integer) from public,anon,authenticated;
grant execute on function public.crm_claim_callback_reminders(integer) to service_role;

create or replace function public.crm_finish_callback_reminder(p_id uuid,p_success boolean,p_error_code text default null)
returns boolean language plpgsql security definer set search_path to ''
as $fn$
begin
 if auth.role()<>'service_role' then raise exception 'service role required'; end if;
 update public.crm_callback_reminder_queue q set
  delivered_at=case when p_success then now() else q.delivered_at end,
  claimed_until=null,
  next_attempt_at=case when p_success then q.next_attempt_at
   else now()+make_interval(mins=>least(60,power(2,least(q.attempts,6))::integer)) end,
  last_error_code=case when p_success then null else left(coalesce(p_error_code,'delivery_failed'),80) end
 where q.id=p_id and q.claimed_until>now() and q.delivered_at is null;
 return found;
end
$fn$;
revoke all on function public.crm_finish_callback_reminder(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.crm_finish_callback_reminder(uuid,boolean,text) to service_role;
