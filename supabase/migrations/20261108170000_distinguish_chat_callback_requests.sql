-- Preserve the existing human_handoff task type and add the visitor's actual intent.
-- Existing records: consented phone callback vs live chat (no contact consent).
ALTER TABLE public.ai_concierge_tasks ADD COLUMN IF NOT EXISTS request_kind text NOT NULL DEFAULT 'live_chat';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='ai_concierge_tasks_request_kind_check') THEN
  ALTER TABLE public.ai_concierge_tasks ADD CONSTRAINT ai_concierge_tasks_request_kind_check CHECK(request_kind IN ('live_chat','callback'));
 END IF;
END $$;
UPDATE public.ai_concierge_tasks t SET request_kind=CASE WHEN c.contact_consent_at IS NOT NULL THEN 'callback' ELSE 'live_chat' END
FROM public.ai_conversations c WHERE c.id=t.conversation_id;
COMMENT ON COLUMN public.ai_concierge_tasks.request_kind IS 'Explicit visitor handoff channel: live_chat or consented callback; task_type remains human_handoff for compatibility.';

CREATE OR REPLACE FUNCTION public.ai_concierge_create_handoff_task(p_conversation uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 insert into public.ai_concierge_tasks(conversation_id,task_type,urgency,escalation_due_at,request_kind)
 select id,'human_handoff','urgent',now()+interval '30 minutes',case when contact_consent_at is not null then 'callback' else 'live_chat' end
 from public.ai_conversations where id=p_conversation and status='waiting_human'
 on conflict do nothing;
 return found;
end $function$;

CREATE OR REPLACE FUNCTION public.ai_concierge_request_human(p_conversation uuid, p_token_hash text, p_message text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare current_status text;
begin
 if length(trim(coalesce(p_message,''))) not between 1 and 500 then return false; end if;
 select status into current_status from public.ai_conversations
 where id=p_conversation and visitor_token_hash=p_token_hash and visitor_expires_at>now() for update;
 if current_status is distinct from 'ai' then return false; end if;
 update public.ai_conversations set status='waiting_human',updated_at=now(),last_message_at=now() where id=p_conversation;
 insert into public.ai_conversation_messages(conversation_id,sender,body) values(p_conversation,'visitor',trim(p_message));
 insert into public.ai_concierge_tasks(conversation_id,task_type,urgency,escalation_due_at,request_kind)
 values(p_conversation,'human_handoff','urgent',now()+interval '30 minutes','live_chat')
 on conflict do nothing;
 return true;
end $function$;

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
 insert into public.ai_concierge_tasks(conversation_id,task_type,urgency,escalation_due_at,request_kind)
 values(p_conversation,'human_handoff','urgent',now()+interval '30 minutes','callback')
 on conflict do nothing;
 return true;
end $function$;


-- Per-conversation contact outcome. Unlike the legacy lead-level RPC, this
-- does not close unrelated requests merely because the contact lead matches.
CREATE OR REPLACE FUNCTION public.crm_record_chat_contact_outcome(
 p_conversation uuid,p_channel text,p_outcome text,p_notes text,
 p_resolve boolean DEFAULT false,p_followup_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 v_lead uuid;
 v_now timestamptz:=now();
 v_count integer:=0;
 v_label text;
BEGIN
 IF v_staff NOT IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') THEN
  RAISE EXCEPTION 'Not authorized';
 END IF;
 IF p_channel NOT IN ('call','text','email')
 OR p_outcome NOT IN ('spoke','replied','no_answer','voicemail','text_sent','email_sent')
 OR length(btrim(coalesce(p_notes,''))) NOT BETWEEN 3 AND 1000 THEN
  RAISE EXCEPTION 'Select a valid channel, outcome, and interaction notes';
 END IF;
 IF p_resolve AND p_outcome NOT IN ('spoke','replied') THEN
  RAISE EXCEPTION 'Only confirmed two-way contact may resolve a callback';
 END IF;
 IF NOT p_resolve AND (p_followup_at IS NULL OR p_followup_at<=v_now OR p_followup_at>v_now+interval '365 days') THEN
  RAISE EXCEPTION 'Schedule a future follow-up before leaving this request unresolved';
 END IF;
 IF p_followup_at IS NOT NULL AND p_followup_at<=v_now THEN
  RAISE EXCEPTION 'Follow-up date must be in the future';
 END IF;
 SELECT c.lead_id INTO v_lead FROM public.ai_conversations c
 WHERE c.id=p_conversation AND c.status IN ('waiting_human','human')
 FOR UPDATE;
 IF v_lead IS NULL THEN
  RAISE EXCEPTION 'This request has no active linked CRM contact';
 END IF;
 PERFORM 1 FROM public.leads WHERE id=v_lead FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Linked CRM lead not found'; END IF;
 INSERT INTO public.lead_contact_events(lead_id,channel,notes,contacted_by,outcome,resolved_callback,created_at)
 VALUES(v_lead,p_channel,btrim(p_notes),v_staff,p_outcome,p_resolve,v_now);
 UPDATE public.leads SET last_contacted_at=
  CASE WHEN p_outcome IN ('spoke','replied') THEN v_now ELSE last_contacted_at END,
  status=CASE WHEN status='new' AND p_outcome IN ('spoke','replied') THEN 'contacted' ELSE status END
 WHERE id=v_lead;
 v_label:=CASE p_channel WHEN 'call' THEN 'Call' WHEN 'text' THEN 'Text' ELSE 'Email' END;
 INSERT INTO public.lead_activities(lead_id,event_type,description,actor)
 VALUES(v_lead,'contact_logged',v_label||' ('||replace(p_outcome,'_',' ')||'): '||btrim(p_notes),v_staff);
 IF p_resolve THEN
  UPDATE public.lead_followups SET status='completed',completed_at=v_now
  WHERE concierge_conversation_id=p_conversation AND status='active';
  UPDATE public.ai_concierge_tasks SET status='completed',completed_at=v_now,updated_at=v_now
  WHERE conversation_id=p_conversation AND status IN ('pending','claimed');
  GET DIAGNOSTICS v_count=ROW_COUNT;
  UPDATE public.ai_conversations SET status='closed',closed_at=v_now,updated_at=v_now
  WHERE id=p_conversation AND status IN ('waiting_human','human');
 ELSE
  UPDATE public.lead_followups SET status='cancelled'
  WHERE concierge_conversation_id=p_conversation AND status='active';
  INSERT INTO public.lead_followups(lead_id,due_at,task,status,created_by,concierge_conversation_id)
  VALUES(v_lead,p_followup_at,'Follow up on '||v_label||' ('||replace(p_outcome,'_',' ')||')','active',v_staff,p_conversation);
  INSERT INTO public.lead_activities(lead_id,event_type,description,actor)
  VALUES(v_lead,'followup_scheduled','Next contact due '||to_char(p_followup_at,'YYYY-MM-DD HH24:MI TZ'),v_staff);
  UPDATE public.ai_concierge_tasks SET due_at=p_followup_at,
   escalation_due_at=p_followup_at+interval '30 minutes',
   escalated_at=NULL,updated_at=v_now
  WHERE conversation_id=p_conversation AND status IN ('pending','claimed');
 END IF;
 RETURN jsonb_build_object('recorded',true,'resolved',p_resolve,
  'completed_tasks',v_count,'conversation_id',p_conversation,
  'needs_followup',NOT p_resolve);
END $function$;
REVOKE ALL ON FUNCTION public.crm_record_chat_contact_outcome(uuid,text,text,text,boolean,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_record_chat_contact_outcome(uuid,text,text,text,boolean,timestamptz) TO authenticated;

-- Prevent the legacy broad lead-level RPC from silently resolving multiple
-- active chat threads for the same person. Single-thread legacy calls remain.
CREATE OR REPLACE FUNCTION public.crm_record_contact_outcome(p_lead uuid, p_channel text, p_outcome text, p_notes text, p_resolve boolean DEFAULT false, p_followup_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_staff text := lower(coalesce(auth.jwt()->>'email',''));
 v_callback boolean;
 v_now timestamptz := now();
 v_count integer := 0;
 v_label text;
 v_conversation uuid;
BEGIN
 IF v_staff NOT IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') THEN
   RAISE EXCEPTION 'Not authorized';
 END IF;
 IF p_channel NOT IN ('call','text','email')
   OR p_outcome NOT IN ('spoke','replied','no_answer','voicemail','text_sent','email_sent')
   OR length(btrim(coalesce(p_notes,''))) NOT BETWEEN 3 AND 1000 THEN
   RAISE EXCEPTION 'Select a valid channel and outcome and describe the interaction';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.ai_conversations c
  WHERE c.lead_id=p_lead AND c.status IN ('waiting_human','human')
  GROUP BY c.lead_id HAVING count(*)>1
 ) THEN
  RAISE EXCEPTION 'Multiple active conversations linked. Open the specific conversation to record its outcome safely.';
 END IF;
 IF p_resolve AND p_outcome NOT IN ('spoke','replied') THEN
   RAISE EXCEPTION 'Only confirmed two-way customer contact can resolve a callback';
 END IF;
 PERFORM 1 FROM public.leads WHERE id=p_lead FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
 SELECT EXISTS(
    SELECT 1 FROM public.ai_conversations c
    WHERE c.lead_id=p_lead AND c.status IN ('waiting_human','human')
 ) INTO v_callback;
 IF v_callback AND NOT p_resolve AND (p_followup_at IS NULL OR p_followup_at <= v_now) THEN
   RAISE EXCEPTION 'Choose a future follow-up for an unresolved callback';
 END IF;
 IF p_followup_at IS NOT NULL AND p_followup_at <= v_now THEN
   RAISE EXCEPTION 'Follow-up date must be in the future';
 END IF;
 INSERT INTO public.lead_contact_events(lead_id,channel,notes,contacted_by,outcome,resolved_callback,created_at)
 VALUES(p_lead,p_channel,btrim(p_notes),v_staff,p_outcome,p_resolve,v_now);
 UPDATE public.leads SET last_contacted_at=CASE WHEN p_outcome IN ('spoke','replied') THEN v_now ELSE last_contacted_at END,
   status=CASE WHEN status='new' AND p_outcome IN ('spoke','replied') THEN 'contacted' ELSE status END
 WHERE id=p_lead;
 v_label:=CASE p_channel WHEN 'call' THEN 'Call' WHEN 'text' THEN 'Text' ELSE 'Email' END;
 INSERT INTO public.lead_activities(lead_id,event_type,description,actor)
 VALUES(p_lead,'contact_logged',v_label||' ('||replace(p_outcome,'_',' ')||'): '||btrim(p_notes),v_staff);
 IF p_followup_at IS NOT NULL AND NOT p_resolve THEN
   SELECT id INTO v_conversation FROM public.ai_conversations
   WHERE lead_id=p_lead AND status IN ('waiting_human','human')
   ORDER BY updated_at DESC LIMIT 1;
   IF v_conversation IS NOT NULL THEN
     UPDATE public.lead_followups SET status='cancelled'
     WHERE concierge_conversation_id=v_conversation AND status='active';
   END IF;
   INSERT INTO public.lead_followups(lead_id,due_at,task,status,created_by,concierge_conversation_id)
   VALUES(p_lead,p_followup_at,'Follow up on '||v_label||' ('||replace(p_outcome,'_',' ')||')','active',v_staff,v_conversation);
   INSERT INTO public.lead_activities(lead_id,event_type,description,actor)
   VALUES(p_lead,'followup_scheduled','Next contact due '||to_char(p_followup_at,'YYYY-MM-DD HH24:MI TZ'),v_staff);
 END IF;
 IF p_resolve THEN
   UPDATE public.lead_followups SET status='completed',completed_at=v_now
   WHERE lead_id=p_lead AND status='active' AND concierge_conversation_id IN (
     SELECT id FROM public.ai_conversations WHERE lead_id=p_lead AND status IN ('waiting_human','human')
   );
   UPDATE public.ai_concierge_tasks t SET status='completed',completed_at=v_now,updated_at=v_now
   FROM public.ai_conversations c
   WHERE t.conversation_id=c.id AND c.lead_id=p_lead AND t.status IN ('pending','claimed');
   GET DIAGNOSTICS v_count = ROW_COUNT;
   UPDATE public.ai_conversations SET status='closed',closed_at=v_now,updated_at=v_now
     WHERE lead_id=p_lead AND status IN ('waiting_human','human');
 ELSIF v_callback THEN
   UPDATE public.ai_concierge_tasks t SET due_at=p_followup_at,escalation_due_at=p_followup_at + interval '30 minutes',
     escalated_at=NULL,updated_at=v_now
   FROM public.ai_conversations c
   WHERE t.conversation_id=c.id AND c.lead_id=p_lead AND t.status IN ('pending','claimed');
 END IF;
 RETURN jsonb_build_object('recorded',true,'resolved',p_resolve,'completed_tasks',v_count,
                           'needs_followup',v_callback AND NOT p_resolve);
END $function$;
