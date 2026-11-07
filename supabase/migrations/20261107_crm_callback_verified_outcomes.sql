-- Callback resolution must be backed by a recorded customer interaction.
-- Existing records and transcripts are preserved; no past completion is rewritten.
ALTER TABLE public.lead_contact_events
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS resolved_callback boolean NOT NULL DEFAULT false;
ALTER TABLE public.lead_followups
  ADD COLUMN IF NOT EXISTS concierge_conversation_id uuid REFERENCES public.ai_conversations(id);
CREATE INDEX IF NOT EXISTS lead_followups_concierge_active_idx
  ON public.lead_followups(concierge_conversation_id) WHERE status='active';

CREATE OR REPLACE FUNCTION public.crm_guard_callback_task_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_lead uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT c.lead_id INTO v_lead FROM public.ai_conversations c WHERE c.id=NEW.conversation_id;
    IF v_lead IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.lead_contact_events e
      WHERE e.lead_id=v_lead AND e.resolved_callback=true
        AND e.outcome IN ('spoke','replied')
        AND e.created_at >= NEW.created_at
        AND e.created_at >= now() - interval '10 minutes'
        AND lower(coalesce(e.contacted_by,''))=lower(coalesce(auth.jwt()->>'email',''))
    ) THEN
      RAISE EXCEPTION 'Record a confirmed call, text, or email outcome in the linked lead before resolving this callback';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS crm_guard_callback_task_completion ON public.ai_concierge_tasks;
CREATE TRIGGER crm_guard_callback_task_completion BEFORE UPDATE OF status ON public.ai_concierge_tasks
FOR EACH ROW EXECUTE FUNCTION public.crm_guard_callback_task_completion();

-- Existing one-click API is no longer permitted; all completion goes through
-- the atomic recorded-contact flow below.
CREATE OR REPLACE FUNCTION public.ai_concierge_complete_task(p_task uuid)
RETURNS boolean LANGUAGE plpgsql SET search_path = ''
AS $$ BEGIN RETURN false; END $$;

CREATE OR REPLACE FUNCTION public.crm_record_contact_outcome(
 p_lead uuid, p_channel text, p_outcome text, p_notes text,
 p_resolve boolean DEFAULT false, p_followup_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.crm_record_contact_outcome(uuid,text,text,text,boolean,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_record_contact_outcome(uuid,text,text,text,boolean,timestamptz) TO authenticated;

-- Task lifecycle is audited in lead activities and tasks; avoid a second
-- actionable-style notification just because staff resolved a callback.
CREATE OR REPLACE FUNCTION public.crm_record_task_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_display text; v_target text := '/dashboard/conversations';
BEGIN
 SELECT left(coalesce(nullif(trim(visitor_name),''),nullif(trim(title),''),'Visitor'),90)
 INTO v_display FROM public.ai_conversations WHERE id=NEW.conversation_id;
 v_display:=coalesce(v_display,'Visitor');
 IF TG_OP='INSERT' THEN
   INSERT INTO public.crm_activity_events(event_key,category,title,summary,target_path)
   VALUES('handoff:'||NEW.id,'handoff','Concierge handoff requested',v_display||' requested assistance',v_target)
   ON CONFLICT(event_key) DO NOTHING;
 ELSE
   IF NEW.escalated_at IS NOT NULL AND OLD.escalated_at IS DISTINCT FROM NEW.escalated_at THEN
     INSERT INTO public.crm_activity_events(event_key,category,title,summary,target_path)
     VALUES('escalation:'||NEW.id,'escalation','Urgent concierge escalation',v_display||' requires prompt attention',v_target)
     ON CONFLICT(event_key) DO NOTHING;
   END IF;

 END IF;
 RETURN NEW;
END $$;

-- Require a contact event before a new lead can be advanced to contacted,
-- qualified or closed by a separate status picker.
CREATE OR REPLACE FUNCTION public.crm_guard_lead_contact_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF OLD.status='new' AND NEW.status IN ('contacted','qualified','closed')
   AND NOT EXISTS (
     SELECT 1 FROM public.lead_contact_events e
     WHERE e.lead_id=NEW.id AND e.created_at >= OLD.created_at
   ) THEN
   RAISE EXCEPTION 'Record a call, text or email outcome before advancing this lead';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_guard_lead_contact_stage ON public.leads;
CREATE TRIGGER crm_guard_lead_contact_stage BEFORE UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_guard_lead_contact_stage();

-- Identity reconciliation happens only after explicit staff selection.
-- A phone match is required; an ambiguous shared-number match is never automatic.
CREATE OR REPLACE FUNCTION public.crm_link_reviewed_callback(
 p_conversation uuid,p_lead uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 v_phone text; v_lead_phone text;
BEGIN
 IF v_staff NOT IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') THEN
   RAISE EXCEPTION 'Not authorized';
 END IF;
 SELECT regexp_replace(coalesce(visitor_phone,''),'[^0-9]','','g') INTO v_phone
 FROM public.ai_conversations WHERE id=p_conversation AND lead_id IS NULL
   AND contact_consent_at IS NOT NULL AND status IN ('waiting_human','human') FOR UPDATE;
 IF v_phone IS NULL THEN RETURN false; END IF;
 SELECT regexp_replace(coalesce(phone,''),'[^0-9]','','g') INTO v_lead_phone
 FROM public.leads WHERE id=p_lead;
 IF length(v_phone)=11 AND left(v_phone,1)='1' THEN v_phone:=right(v_phone,10); END IF;
 IF length(v_lead_phone)=11 AND left(v_lead_phone,1)='1' THEN v_lead_phone:=right(v_lead_phone,10); END IF;
 IF length(v_phone)<>10 OR v_phone IS DISTINCT FROM v_lead_phone THEN RETURN false; END IF;
 UPDATE public.ai_conversations SET lead_id=p_lead,updated_at=now() WHERE id=p_conversation AND lead_id IS NULL;
 RETURN found;
END $$;
REVOKE ALL ON FUNCTION public.crm_link_reviewed_callback(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_link_reviewed_callback(uuid,uuid) TO authenticated;

-- If staff confirms the caller is a distinct person even though the phone is
-- shared, explicitly create a separate lead rather than silently merging.
CREATE OR REPLACE FUNCTION public.crm_create_reviewed_callback_lead(
 p_conversation uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 v_name text;v_phone text;v_lead uuid;
BEGIN
 IF v_staff NOT IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') THEN
   RAISE EXCEPTION 'Not authorized';
 END IF;
 SELECT visitor_name,visitor_phone INTO v_name,v_phone FROM public.ai_conversations
 WHERE id=p_conversation AND lead_id IS NULL AND contact_consent_at IS NOT NULL
   AND status IN ('waiting_human','human') FOR UPDATE;
 IF v_name IS NULL OR v_phone IS NULL THEN RAISE EXCEPTION 'Callback is not eligible for reviewed lead creation'; END IF;
 INSERT INTO public.leads(name,phone,email,message,source_page,status)
 VALUES(v_name,v_phone,'','Staff-reviewed concierge callback','AI Concierge','new')
 RETURNING id INTO v_lead;
 UPDATE public.ai_conversations SET lead_id=v_lead,updated_at=now() WHERE id=p_conversation;
 RETURN v_lead;
END $$;
REVOKE ALL ON FUNCTION public.crm_create_reviewed_callback_lead(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_create_reviewed_callback_lead(uuid) TO authenticated;

-- Keep completed-task audit events in History, but do not count them in the
-- active notification totals. One request remains one outstanding job.
CREATE OR REPLACE FUNCTION public.crm_activity_totals()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
BEGIN
 IF v_staff NOT IN ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com') THEN
   RAISE EXCEPTION 'not authorized';
 END IF;
 RETURN (
 SELECT jsonb_build_object(
   'total',count(*) FILTER(WHERE r.archived_at IS NULL AND NOT coalesce(l.status='archived',false)
      AND e.event_key NOT LIKE 'staff:completed:%' AND e.event_key NOT LIKE 'staff:claimed:%' AND NOT (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id))),
   'unread',count(*) FILTER(WHERE r.archived_at IS NULL AND r.read_at IS NULL AND NOT coalesce(l.status='archived',false)
      AND e.event_key NOT LIKE 'staff:completed:%' AND e.event_key NOT LIKE 'staff:claimed:%' AND NOT (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id))),
   'urgent',count(*) FILTER(WHERE r.archived_at IS NULL AND e.category='escalation' AND NOT coalesce(l.status='archived',false)
      AND e.event_key NOT LIKE 'staff:completed:%' AND e.event_key NOT LIKE 'staff:claimed:%' AND NOT (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id))),
   'today',count(*) FILTER(WHERE r.archived_at IS NULL AND e.created_at>=now()-interval '24 hours' AND NOT coalesce(l.status='archived',false)
      AND e.event_key NOT LIKE 'staff:completed:%' AND e.event_key NOT LIKE 'staff:claimed:%' AND NOT (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id))),
   'hidden',count(*) FILTER(WHERE r.archived_at IS NOT NULL OR coalesce(l.status='archived',false)
      OR e.event_key LIKE 'staff:completed:%' OR e.event_key LIKE 'staff:claimed:%' OR (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id)))
 )
 FROM public.crm_activity_events e
 LEFT JOIN public.crm_activity_receipts r ON r.event_id=e.id AND r.staff_email=v_staff
 LEFT JOIN public.leads l ON e.target_path='/dashboard/leads?lead='||l.id::text
 WHERE NOT EXISTS (
   SELECT 1 FROM public.crm_activity_events canonical
   WHERE e.event_key='lead:existing:'||l.id::text
     AND canonical.event_key='lead:'||l.id::text
     AND canonical.category='lead' AND canonical.target_path=e.target_path
 )
 );
END $$;

-- One lead + one active callback + one waiting conversation is ONE job.
CREATE OR REPLACE FUNCTION public.crm_attention_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 v_new integer;v_uncovered_new integer;v_tasks integer;v_waiting integer;v_uncovered_waiting integer;
BEGIN
 IF v_staff NOT IN ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com') THEN
   RAISE EXCEPTION 'not authorized';
 END IF;
 SELECT count(*)::integer INTO v_new FROM public.leads WHERE status='new';
 SELECT count(*)::integer INTO v_uncovered_new FROM public.leads l WHERE l.status='new'
   AND NOT EXISTS (
     SELECT 1 FROM public.ai_conversations c
     WHERE c.lead_id=l.id AND (
        c.status='waiting_human'
        OR EXISTS (SELECT 1 FROM public.ai_concierge_tasks t WHERE t.conversation_id=c.id AND t.status IN ('pending','claimed'))
     )
   );
 SELECT count(*)::integer INTO v_tasks FROM public.ai_concierge_tasks WHERE status IN ('pending','claimed');
 SELECT count(*)::integer, count(*) FILTER(
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_concierge_tasks t
    WHERE t.conversation_id=c.id AND t.status IN ('pending','claimed')
  )
 )::integer INTO v_waiting,v_uncovered_waiting
 FROM public.ai_conversations c WHERE c.status='waiting_human';
 RETURN jsonb_build_object(
   'new_leads',v_new,'new_leads_without_callback',v_uncovered_new,
   'open_tasks',v_tasks,'waiting_conversations',v_waiting,
   'waiting_conversations_without_task',v_uncovered_waiting,
   'attention_count',v_uncovered_new+v_tasks+v_uncovered_waiting);
END $$;

-- Suppress synthetic Concierge lead creation activity in active totals when
-- it is already represented by the linked handoff notification.
