-- Dedicated, privacy-conscious proactive buyer/seller opportunity signals.
-- Existing callback tasks, receipts and push queue behavior remain unchanged.
alter table public.ai_conversations
  add column if not exists opportunity_kind text;
alter table public.ai_conversations
  drop constraint if exists ai_conversations_opportunity_kind_check;
alter table public.ai_conversations
  add constraint ai_conversations_opportunity_kind_check
  check (opportunity_kind is null or opportunity_kind in ('buyer','seller','both','investor'));

alter table public.crm_activity_events
  drop constraint if exists crm_activity_events_category_check;
alter table public.crm_activity_events
  add constraint crm_activity_events_category_check
  check (category in ('lead','handoff','escalation','staff','opportunity'));

-- Push events may be attached to an existing callback task OR a conversation.
alter table public.ai_concierge_push_outbox alter column task_id drop not null;
alter table public.ai_concierge_push_outbox
  add column if not exists conversation_id uuid
  references public.ai_conversations(id) on delete cascade;
alter table public.ai_concierge_push_outbox
  drop constraint if exists ai_concierge_push_outbox_subject_check;
alter table public.ai_concierge_push_outbox
  add constraint ai_concierge_push_outbox_subject_check
  check ((task_id is not null) <> (conversation_id is not null));
alter table public.ai_concierge_push_outbox
  drop constraint if exists ai_concierge_push_outbox_event_type_check;
alter table public.ai_concierge_push_outbox
  add constraint ai_concierge_push_outbox_event_type_check
  check (event_type in ('handoff_created','handoff_escalated','handoff_claimed','opportunity_detected'));
create unique index if not exists ai_concierge_opportunity_push_unique
  on public.ai_concierge_push_outbox(conversation_id,event_type)
  where conversation_id is not null;

create or replace function public.crm_record_live_opportunity()
returns trigger language plpgsql security definer set search_path to ''
as $fn$
declare
  v_title text;
  v_summary text;
begin
  -- Staff can already claim these AI conversations; never create opportunities
  -- for closed, claimed, or explicitly requested human-handoff conversations.
  if new.status <> 'ai' or new.opportunity_kind is null
     or new.priority not in ('warm','hot')
     or new.visitor_token_hash is null then
    return new;
  end if;
  v_title := case new.opportunity_kind
    when 'seller' then 'Live Seller Interest'
    when 'buyer' then 'Live Buyer Interest'
    when 'investor' then 'Live Investor Interest'
    else 'Live Buyer & Seller Interest' end;
  v_summary := case new.opportunity_kind
    when 'seller' then 'A visitor is discussing selling a property.'
    when 'buyer' then 'A visitor is discussing a specific property or showing.'
    when 'investor' then 'A visitor is discussing a real estate investment.'
    else 'A visitor is discussing both buying and selling.' end;
  insert into public.crm_activity_events(event_key,category,title,summary,target_path)
  values ('opportunity:'||new.id::text,'opportunity',v_title,v_summary,
    '/dashboard/conversations?conversation='||new.id::text)
  on conflict (event_key) do update
    set title=excluded.title,summary=excluded.summary;

  -- Only the first qualifying milestone produces a background alert.
  insert into public.ai_concierge_push_outbox(conversation_id,event_type)
  values(new.id,'opportunity_detected')
  on conflict do nothing;
  return new;
end $fn$;
revoke all on function public.crm_record_live_opportunity() from public, anon, authenticated;
drop trigger if exists crm_live_opportunity_changed on public.ai_conversations;
create trigger crm_live_opportunity_changed
 after update of opportunity_kind on public.ai_conversations
 for each row when (new.opportunity_kind is distinct from old.opportunity_kind)
 execute function public.crm_record_live_opportunity();
