-- Archiving is a reversible CRM lifecycle event, not a deletion.
-- This migration adds informational audit events without changing callback task outcomes.
create or replace function public.crm_record_lead_archive_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_title text;
  v_summary text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status <> 'archived' and old.status <> 'archived' then
    return new;
  end if;
  v_name := left(regexp_replace(btrim(coalesce(new.name,'Customer')),'[[:cntrl:]]+',' ','g'),90);
  if new.status = 'archived' then
    v_title := 'Lead Archived';
    v_summary := v_name || ' was moved to Archived. Previous lead alerts are no longer active.';
  else
    v_title := 'Lead Reactivated';
    v_summary := v_name || ' was restored from Archived to ' || new.status || '.';
  end if;
  insert into public.crm_activity_events(event_key,category,title,summary,target_path)
  values ('staff:lead-lifecycle:' || new.id::text || ':' || pg_catalog.gen_random_uuid()::text,
          'staff',v_title,v_summary,'/dashboard/leads?lead=' || new.id::text);
  return new;
end;
$$;
drop trigger if exists crm_lead_archive_transition on public.leads;
create trigger crm_lead_archive_transition
after update of status on public.leads
for each row execute function public.crm_record_lead_archive_transition();
revoke all on function public.crm_record_lead_archive_transition() from public,anon,authenticated;
