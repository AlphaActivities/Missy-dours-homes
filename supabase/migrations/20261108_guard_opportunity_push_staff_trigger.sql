-- The existing staff-activity outbox trigger only understands callback task events.
-- Proactive opportunities are already represented by crm_record_live_opportunity.
-- Never let a conversation-only push create a null-key callback notice.
create or replace function public.crm_record_staff_event()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare display_name text; category_name text; notice_title text; notice_key text;
begin
  if new.event_type='opportunity_detected' or new.task_id is null then
    return new;
  end if;
  select left(coalesce(nullif(trim(c.visitor_name),''),nullif(trim(c.title),''),'Visitor'),90)
    into display_name
  from public.ai_concierge_tasks t left join public.ai_conversations c on c.id=t.conversation_id
  where t.id=new.task_id;
  display_name:=coalesce(display_name,'Visitor');
  if new.event_type='handoff_escalated' then
    category_name:='escalation';notice_title:='Urgent concierge escalation';notice_key:='escalation:';
  elsif new.event_type='handoff_claimed' then
    category_name:='staff';notice_title:='Conversation claimed';notice_key:='staff:claimed:';
  else
    category_name:='handoff';notice_title:='Concierge handoff requested';notice_key:='handoff:';
  end if;
  insert into public.crm_activity_events(event_key,category,title,summary,target_path)
  values(notice_key||new.task_id,category_name,notice_title,display_name||' · Concierge activity','/dashboard/conversations')
  on conflict(event_key) do nothing;
  return new;
end $function$;
