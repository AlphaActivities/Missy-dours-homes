-- Missy owner controls: authorization, audit history and trigger-only RPC hardening.
-- This migration mirrors the verified live migration applied on 2026-11-06.
create table if not exists public.missy_owner_audit_events (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 actor_email text not null,
 action text not null check (action in ('concierge_published','concierge_paused','concierge_purged')),
 details jsonb not null default '{}'::jsonb
);
alter table public.missy_owner_audit_events enable row level security;
revoke all on public.missy_owner_audit_events from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.missy_owner_concierge_launch_status()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if lower(coalesce(auth.jwt()->>'email','')) <> 'yourcustomerflowguy@gmail.com' or auth.uid() is null then
  raise exception 'Owner authorization required';
 end if;
 return coalesce((select enabled from public.concierge_launch_state where id=true),false);
end $function$;

CREATE OR REPLACE FUNCTION public.missy_owner_purge_concierge_conversations(p_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n_conversations integer; n_tasks integer; n_messages integer;
begin
 if lower(coalesce(auth.jwt()->>'email','')) <> 'yourcustomerflowguy@gmail.com' or auth.uid() is null then
  raise exception 'Owner authorization required';
 end if;
 if p_confirmation <> 'DELETE ALL CONVERSATIONS' then raise exception 'Confirmation phrase does not match'; end if;
 perform pg_catalog.pg_advisory_xact_lock(451900,20261103);
 if exists(select 1 from public.ai_conversation_attachments limit 1) then
  raise exception 'Deletion blocked: conversations contain attachments requiring storage cleanup';
 end if;
 select count(*) into n_conversations from public.ai_conversations;
 select count(*) into n_tasks from public.ai_concierge_tasks;
 select count(*) into n_messages from public.ai_conversation_messages;
 delete from public.ai_concierge_push_receipts where event_id in(select id from public.ai_concierge_push_outbox);
 delete from public.ai_concierge_push_outbox;
 delete from public.ai_concierge_tasks;
 delete from public.ai_conversation_messages;
 delete from public.ai_conversations;
 insert into public.missy_owner_audit_events(actor_email,action,details) values('yourcustomerflowguy@gmail.com','concierge_purged',jsonb_build_object('deleted_conversations',n_conversations,'deleted_messages',n_messages,'deleted_tasks',n_tasks));
 return jsonb_build_object('deleted_conversations',n_conversations,'deleted_tasks',n_tasks,'deleted_messages',n_messages,'leads_preserved',true,'devices_preserved',true);
end $function$;

CREATE OR REPLACE FUNCTION public.missy_owner_recent_audit(p_limit integer DEFAULT 25)
 RETURNS TABLE(created_at timestamp with time zone, actor_email text, action text, details jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) <> 'yourcustomerflowguy@gmail.com' then
   raise exception 'Owner authorization required' using errcode='42501';
 end if;
 return query select a.created_at,a.actor_email,a.action,a.details from public.missy_owner_audit_events a order by a.created_at desc limit least(greatest(coalesce(p_limit,25),1),50);
end $function$;

CREATE OR REPLACE FUNCTION public.missy_owner_set_concierge_launch(p_enabled boolean, p_confirmation text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if lower(coalesce(auth.jwt()->>'email','')) <> 'yourcustomerflowguy@gmail.com' or auth.uid() is null then
   raise exception 'Owner authorization required';
 end if;
 if p_confirmation <> (case when p_enabled then 'PUBLISH CONCIERGE' else 'PAUSE CONCIERGE' end) then
   raise exception 'Confirmation phrase does not match';
 end if;
 update public.concierge_launch_state set enabled=p_enabled,updated_at=now() where id=true;
 insert into public.missy_owner_audit_events(actor_email,action,details)
 values('yourcustomerflowguy@gmail.com',case when p_enabled then 'concierge_published' else 'concierge_paused' end,jsonb_build_object('enabled',p_enabled));
 return p_enabled;
end $function$;

revoke all on function public.missy_owner_concierge_launch_status() from public,anon;
revoke all on function public.missy_owner_set_concierge_launch(boolean,text) from public,anon;
revoke all on function public.missy_owner_purge_concierge_conversations(text) from public,anon;
revoke all on function public.missy_owner_recent_audit(integer) from public,anon;
grant execute on function public.missy_owner_concierge_launch_status() to authenticated,service_role;
grant execute on function public.missy_owner_set_concierge_launch(boolean,text) to authenticated,service_role;
grant execute on function public.missy_owner_purge_concierge_conversations(text) to authenticated,service_role;
grant execute on function public.missy_owner_recent_audit(integer) to authenticated,service_role;
revoke all on function public.crm_record_followup_event() from public,anon,authenticated;
revoke all on function public.crm_record_lead_event() from public,anon,authenticated;
revoke all on function public.crm_record_staff_event() from public,anon,authenticated;
revoke all on function public.crm_record_task_event() from public,anon,authenticated;
