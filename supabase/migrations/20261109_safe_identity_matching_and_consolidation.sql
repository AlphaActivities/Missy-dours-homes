-- Identity re-use requires one active candidate matching normalized phone AND
-- punctuation-insensitive name. Existing archived records are never revived.
create or replace function public.crm_normalize_identity_name(p_name text)
returns text language sql immutable strict set search_path to ''
as $fn$ select regexp_replace(lower(btrim(p_name)),'[^a-z0-9]+','','g') $fn$;
revoke all on function public.crm_normalize_identity_name(text) from public,anon;
grant execute on function public.crm_normalize_identity_name(text) to authenticated,service_role;
CREATE OR REPLACE FUNCTION public.ai_concierge_request_human_with_contact(p_conversation uuid, p_token_hash text, p_message text, p_name text, p_phone text, p_consent boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_status text;
 v_digits text;
 v_phone_matches integer:=0;
 v_exact_active_matches integer:=0;
 v_lead uuid;
 v_name text:=btrim(coalesce(p_name,''));
 v_phone text:=btrim(coalesce(p_phone,''));
 v_note text:=btrim(coalesce(p_message,''));
begin
 if p_consent is distinct from true or length(v_name) not between 2 and 100
    or length(v_phone) not between 10 and 24 or length(v_note) not between 1 and 500 then
  return false;
 end if;
 if v_phone !~ '^[+0-9 ()-]+$' then return false; end if;
 v_digits:=regexp_replace(v_phone,'[^0-9]','','g');
 if length(v_digits)=11 and left(v_digits,1)='1' then v_digits:=right(v_digits,10); end if;
 if length(v_digits)<>10 then return false; end if;

 select status into v_status from public.ai_conversations
 where id=p_conversation and visitor_token_hash=p_token_hash and visitor_expires_at>now()
 for update;
 if v_status is distinct from 'ai' then return false; end if;

 -- Serialize callbacks for the same phone to avoid parallel lead creation.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_digits,0));

 -- Consider ALL candidates, not the first two arbitrarily returned records.
 -- Phone formatting is normalized; name comparison ignores only case and
 -- surrounding whitespace, never fuzzy-matches a different person's name.
 select count(*)::integer,
        count(*) filter(where public.crm_normalize_identity_name(name)=public.crm_normalize_identity_name(v_name)
                          and coalesce(status,'')<>'archived')::integer,
        (array_agg(id order by created_at desc,id desc)
           filter(where public.crm_normalize_identity_name(name)=public.crm_normalize_identity_name(v_name)
                          and coalesce(status,'')<>'archived'))[1]
 into v_phone_matches,v_exact_active_matches,v_lead
 from public.leads
 where right(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),10)=v_digits
   and (length(regexp_replace(coalesce(phone,''),'[^0-9]','','g'))=10
        or (length(regexp_replace(coalesce(phone,''),'[^0-9]','','g'))=11
            and left(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),1)='1'));

 if v_phone_matches=0 or (v_phone_matches>0 and not exists (
  select 1 from public.leads l where coalesce(l.status,'')<>'archived'
    and right(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),10)=v_digits
    and (length(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'))=10
      or (length(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'))=11
        and left(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),1)='1'))
 )) then
  -- Brand new numbers and archived-only histories get their own active lead.
  -- Never revive, edit, or infer identity from archived historical records.
  insert into public.leads(name,phone,email,message,source_page,status)
  values(v_name,v_phone,'',v_note,'AI Concierge','new')
  returning id into v_lead;
 elsif v_exact_active_matches<>1 then
  -- A shared/reassigned number is not proof of identity. Automatically
  -- create an independent lead instead of blocking staff or merging histories.
  insert into public.leads(name,phone,email,message,source_page,status)
  values(v_name,v_phone,'',v_note,'AI Concierge','new')
  returning id into v_lead;
 end if;

 update public.ai_conversations
 set visitor_name=v_name,visitor_phone=v_phone,contact_consent_at=now(),
     lead_id=v_lead,status='waiting_human',updated_at=now(),last_message_at=now()
 where id=p_conversation;

 insert into public.ai_conversation_messages(conversation_id,sender,body)
 values(p_conversation,'visitor',v_note);
 insert into public.ai_concierge_tasks(conversation_id,task_type,urgency,escalation_due_at,request_kind)
 values(p_conversation,'human_handoff','urgent',now()+interval '30 minutes','callback')
 on conflict do nothing;
 return true;
end $function$

-- Explicit, audited consolidation preserves original lead records and customer intake.
create table if not exists public.crm_lead_consolidations (
 id uuid primary key default gen_random_uuid(),
 primary_lead_id uuid not null references public.leads(id),
 secondary_lead_id uuid not null unique references public.leads(id),
 reviewed_by text not null,
 verification_note text,
 confirmed_at timestamptz not null default now(),
 original_secondary jsonb not null,
 check(primary_lead_id<>secondary_lead_id)
);
alter table public.crm_lead_consolidations enable row level security;
revoke all on public.crm_lead_consolidations from public,anon;
grant select on public.crm_lead_consolidations to authenticated;
create policy "approved staff review consolidations" on public.crm_lead_consolidations
for select to authenticated using (lower(coalesce(auth.jwt()->>'email','')) in
 ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

create or replace function public.crm_consolidate_verified_leads(p_primary uuid,p_secondary uuid,p_confirmation text,p_verification_note text default null)
returns uuid language plpgsql security definer set search_path to ''
as $fn$
declare v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 a public.leads%rowtype; b public.leads%rowtype; ap text; bp text;
begin
 if v_staff not in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') then raise exception 'Unauthorized';end if;
 if p_primary is null or p_secondary is null or p_primary=p_secondary then raise exception 'Select two different leads';end if;
 if p_confirmation is distinct from 'CONFIRM SAME CUSTOMER' then raise exception 'Explicit confirmation required';end if;
 select * into a from public.leads where id=p_primary for update;
 select * into b from public.leads where id=p_secondary for update;
 if a.id is null or b.id is null or a.status='archived' then raise exception 'Primary must be an active lead and both leads must exist';end if;
 if exists(select 1 from public.crm_lead_consolidations where secondary_lead_id=p_secondary) then raise exception 'Already consolidated';end if;
 ap:=regexp_replace(a.phone,'[^0-9]','','g'); bp:=regexp_replace(b.phone,'[^0-9]','','g');
 if length(ap)=11 and left(ap,1)='1' then ap:=right(ap,10);end if;
 if length(bp)=11 and left(bp,1)='1' then bp:=right(bp,10);end if;
 if length(ap)<>10 or ap<>bp then raise exception 'Phone mismatch';end if;
 if public.crm_normalize_identity_name(a.name)<>public.crm_normalize_identity_name(b.name)
    and (p_verification_note is null or length(btrim(p_verification_note))<20)
 then raise exception 'Different names require staff-recorded identity verification';end if;
 if a.email<>'' and b.email<>'' and lower(a.email)<>lower(b.email)
 then raise exception 'Conflicting emails require additional identity verification';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ap,0));
 insert into public.crm_lead_consolidations(primary_lead_id,secondary_lead_id,reviewed_by,verification_note,original_secondary)
 values(p_primary,p_secondary,v_staff,nullif(btrim(p_verification_note),''),to_jsonb(b));
 update public.ai_conversations set lead_id=p_primary where lead_id=p_secondary;
 update public.lead_contact_events set lead_id=p_primary where lead_id=p_secondary;
 update public.lead_followups set lead_id=p_primary where lead_id=p_secondary;
 update public.lead_activities set lead_id=p_primary where lead_id=p_secondary;
 update public.crm_callback_reminder_queue set lead_id=p_primary where lead_id=p_secondary;
 insert into public.lead_activities(lead_id,event_type,description,actor)
 values(p_primary,'note_saved','Staff consolidated a verified identity. Original submission and notes remain preserved in archived source record.',v_staff);
 update public.leads set status='archived' where id=p_secondary;
 return p_primary;
end $fn$;
revoke all on function public.crm_consolidate_verified_leads(uuid,uuid,text,text) from public,anon;
grant execute on function public.crm_consolidate_verified_leads(uuid,uuid,text,text) to authenticated;
