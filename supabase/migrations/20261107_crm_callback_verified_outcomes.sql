-- Callback resolution must be backed by a recorded customer interaction.
-- Existing records and transcripts are preserved; no past completion is rewritten.
ALTER TABLE public.lead_contact_events
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS resolved_callback boolean NOT NULL DEFAULT false;

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
    WHERE c.lead_id=p_lead AND c.status='waiting_human'
 ) INTO v_callback;
 IF v_callback AND NOT p_resolve AND (p_followup_at IS NULL OR p_followup_at <= v_now) THEN
   RAISE EXCEPTION 'Choose a future follow-up for an unresolved callback';
 END IF;
 IF p_followup_at IS NOT NULL AND p_followup_at <= v_now THEN
   RAISE EXCEPTION 'Follow-up date must be in the future';
 END IF;
 INSERT INTO public.lead_contact_events(lead_id,channel,notes,contacted_by,outcome,resolved_callback,created_at)
 VALUES(p_lead,p_channel,btrim(p_notes),v_staff,p_outcome,p_resolve,v_now);
 UPDATE public.leads SET last_contacted_at=v_now,
   status=CASE WHEN status='new' AND p_outcome IN ('spoke','replied') THEN 'contacted' ELSE status END
 WHERE id=p_lead;
 v_label:=CASE p_channel WHEN 'call' THEN 'Call' WHEN 'text' THEN 'Text' ELSE 'Email' END;
 INSERT INTO public.lead_activities(lead_id,event_type,description,actor)
 VALUES(p_lead,'contact_logged',v_label||' ('||replace(p_outcome,'_',' ')||'): '||btrim(p_notes),v_staff);
 IF p_followup_at IS NOT NULL AND NOT p_resolve THEN
   INSERT INTO public.lead_followups(lead_id,due_at,task,status,created_by)
   VALUES(p_lead,p_followup_at,'Follow up on '||v_label||' ('||replace(p_outcome,'_',' ')||')','active',v_staff);
   INSERT INTO public.lead_activities(lead_id,event_type,description,actor)
   VALUES(p_lead,'followup_scheduled','Next contact due '||to_char(p_followup_at,'YYYY-MM-DD HH24:MI TZ'),v_staff);
 END IF;
 IF p_resolve THEN
   UPDATE public.ai_concierge_tasks t SET status='completed',completed_at=v_now,updated_at=v_now
   FROM public.ai_conversations c
   WHERE t.conversation_id=c.id AND c.lead_id=p_lead AND t.status IN ('pending','claimed');
   GET DIAGNOSTICS v_count = ROW_COUNT;
   UPDATE public.ai_conversations SET status='closed',closed_at=v_now,updated_at=v_now
     WHERE lead_id=p_lead AND status='waiting_human';
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
