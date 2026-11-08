-- Improve the existing callback-time automatic match, without merging lead records.
-- Exactly one ACTIVE lead with an exact normalized name and phone may link.
-- Archived contacts are never reactivated or linked automatically.
-- Ambiguity still requires explicit human verification.
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

 if v_phone_matches=0 then
  -- Completely new phone: standard consented lead capture, no review needed.
  insert into public.leads(name,phone,email,message,source_page,status)
  values(v_name,v_phone,'',v_note,'AI Concierge','new')
  returning id into v_lead;
 elsif v_exact_active_matches<>1 then
  -- Multiple exact active matches, mismatched names, or only archived leads:
  -- do not guess which person's history should be accessible.
  v_lead:=null;
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
