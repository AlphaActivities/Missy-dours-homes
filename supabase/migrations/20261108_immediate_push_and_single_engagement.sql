-- Dispatch notifications when queued, rather than waiting up to 60 seconds.
-- pg_net requests begin only after the writing transaction commits.
-- Existing cron fallback remains active for recovery and retry attempts.
create or replace function concierge_private.dispatch_new_push_event()
returns trigger language plpgsql security definer set search_path to ''
as $fn$
begin
 begin
  perform concierge_private.dispatch_pending_pushes();
 exception when others then
  -- Never make a customer callback or opportunity event fail because
  -- the push worker was temporarily unavailable.
  raise warning 'Immediate concierge push dispatch unavailable';
 end;
 return new;
end $fn$;
revoke all on function concierge_private.dispatch_new_push_event() from public,anon,authenticated;
drop trigger if exists concierge_push_immediate_dispatch on public.ai_concierge_push_outbox;
create trigger concierge_push_immediate_dispatch
after insert on public.ai_concierge_push_outbox
for each row execute function concierge_private.dispatch_new_push_event();

-- The early visitor activity alert is one per verified conversation, never
-- per keystroke. No draft, message text, name, phone or identity is saved.
alter table public.ai_concierge_push_outbox
drop constraint if exists ai_concierge_push_outbox_event_type_check;
alter table public.ai_concierge_push_outbox
add constraint ai_concierge_push_outbox_event_type_check
check(event_type in ('handoff_created','handoff_escalated','handoff_claimed','opportunity_detected','visitor_engaged'));
create unique index if not exists concierge_push_one_visitor_engagement
on public.ai_concierge_push_outbox(conversation_id,event_type)
where event_type='visitor_engaged';
