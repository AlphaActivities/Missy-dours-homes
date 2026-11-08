-- Generalized callback resolution: no automatic merging by phone alone.
-- Exact unique active name+phone -> link; otherwise create a separate lead.
-- Historical conversation reconciliation requires prior contact consent.
-- Surgically refine existing callback matching without altering takeover,
-- notification triggers, lead ownership, consent or historic records.
create or replace function public.ai_concierge_request_human_with_contact(
 p_conversation uuid,p_token_hash text,p_message text,p_name text,p_phone text,p_consent boolean)
returns boolean
language plpgsql set search_path to ''
as $function$
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
        count(*) filter(where lower(btrim(coalesce(name,'')))=lower(v_name)
                          and coalesce(status,'')<>'archived')::integer,
        (array_agg(id order by created_at desc,id desc)
           filter(where lower(btrim(coalesce(name,'')))=lower(v_name)
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
 insert into public.ai_concierge_tasks(conversation_id,task_type,urgency,escalation_due_at)
 values(p_conversation,'human_handoff','urgent',now()+interval '30 minutes')
 on conflict do nothing;
 return true;
end $function$;


-- Staff-only, idempotent reconciliation of previously unlinked callback sessions.
-- Runs on conversation review; never bulk rewrites older leads.
create or replace function public.crm_resolve_archived_only_callback(p_conversation uuid)
returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
 v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 v_name text;
 v_phone text;
 v_digits text;
 v_consent timestamptz;
 v_lead uuid;
 v_matches integer;
 v_active integer;
 v_exact_active integer;
 v_matching_lead uuid;
begin
 if v_staff not in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') then
  raise exception 'Not authorized';
 end if;
 select visitor_name,visitor_phone,contact_consent_at into v_name,v_phone,v_consent
 from public.ai_conversations
 where id=p_conversation and lead_id is null and status in ('waiting_human','human')
 for update;
 if not found or v_consent is null or length(btrim(coalesce(v_name,'')))<2 then return null; end if;
 v_digits:=regexp_replace(coalesce(v_phone,''),'[^0-9]','','g');
 if length(v_digits)=11 and left(v_digits,1)='1' then v_digits:=right(v_digits,10); end if;
 if length(v_digits)<>10 then return null; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_digits,0));
 select count(*)::integer,count(*) filter(where coalesce(l.status,'')<>'archived')::integer
 into v_matches,v_active from public.leads l
 where right(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),10)=v_digits
 and (length(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'))=10 or
 (length(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'))=11
 and left(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),1)='1'));
 -- Use a unique active exact name+phone match if one exists.
 -- Otherwise create a separate lead, preserving every existing lead.
 select count(*)::integer,(array_agg(l.id order by l.created_at desc,l.id desc))[1]
 into v_exact_active,v_matching_lead from public.leads l
 where right(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),10)=v_digits
   and (length(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'))=10
    or (length(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'))=11
    and left(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),1)='1'))
   and coalesce(l.status,'')<>'archived'
   and lower(btrim(coalesce(l.name,'')))=lower(btrim(v_name));
 if v_exact_active=1 then
  v_lead:=v_matching_lead;
 else
  insert into public.leads(name,phone,email,message,source_page,status)
  values(btrim(v_name),v_phone,'','Recovered consented concierge callback','AI Concierge','new')
  returning id into v_lead;
 end if;
 update public.ai_conversations set lead_id=v_lead,updated_at=now()
 where id=p_conversation and lead_id is null;
 if not found then raise exception 'Callback link changed concurrently'; end if;
 return v_lead;
end $function$;
revoke all on function public.crm_resolve_archived_only_callback(uuid) from public,anon;
grant execute on function public.crm_resolve_archived_only_callback(uuid) to authenticated;
