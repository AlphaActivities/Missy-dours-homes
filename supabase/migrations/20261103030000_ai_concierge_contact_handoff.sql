-- Contact intake is only callable through the server-side concierge API.
-- No visitor-accessible table permissions or public messaging switches are enabled.
ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS visitor_name text,
  ADD COLUMN IF NOT EXISTS visitor_phone text,
  ADD COLUMN IF NOT EXISTS contact_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.ai_concierge_request_human_with_contact(
  p_conversation uuid, p_token_hash text, p_message text,
  p_name text, p_phone text, p_consent boolean
) RETURNS boolean
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_status text;
  v_digits text;
  v_existing uuid[];
  v_lead uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_note text := btrim(coalesce(p_message, ''));
BEGIN
  IF p_consent IS DISTINCT FROM true OR length(v_name) NOT BETWEEN 2 AND 100
     OR length(v_phone) NOT BETWEEN 10 AND 24 OR length(v_note) NOT BETWEEN 1 AND 500 THEN
    RETURN false;
  END IF;
  IF v_phone !~ '^[+0-9 ()-]+$' THEN RETURN false; END IF;
  v_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
    v_digits := right(v_digits, 10);
  END IF;
  IF length(v_digits) <> 10 THEN RETURN false; END IF;

  SELECT status INTO v_status
    FROM public.ai_conversations
   WHERE id = p_conversation AND visitor_token_hash = p_token_hash
     AND visitor_expires_at > now()
   FOR UPDATE;
  IF v_status IS DISTINCT FROM 'ai' THEN RETURN false; END IF;

  -- Serialize concurrent handoffs using the same contact number.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_digits, 0));
  SELECT array_agg(candidate.id) INTO v_existing
  FROM (
    SELECT id FROM public.leads
    WHERE right(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g'), 10) = v_digits
      AND (length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) = 10
        OR (length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) = 11
        AND left(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g'),1)='1'))
    LIMIT 2
  ) AS candidate;
  IF coalesce(array_length(v_existing, 1), 0) = 1 THEN
    -- Require the name as well as the phone to agree. A reused or shared
    -- number must never silently attach a conversation to someone else's lead.
    SELECT id INTO v_lead FROM public.leads
      WHERE id = v_existing[1] AND lower(btrim(name)) = lower(v_name);
  ELSIF coalesce(array_length(v_existing, 1), 0) = 0 THEN
    INSERT INTO public.leads(name, phone, email, message, source_page, status)
      VALUES(v_name, v_phone, '', v_note, 'AI Concierge', 'new')
      RETURNING id INTO v_lead;
  END IF;
  -- Ambiguous shared-number matches deliberately remain unlinked; avoid
  -- accidentally attaching a private conversation to the wrong customer.
  UPDATE public.ai_conversations
     SET visitor_name = v_name, visitor_phone = v_phone,
         contact_consent_at = now(), lead_id = v_lead,
         status = 'waiting_human', updated_at = now(), last_message_at = now()
   WHERE id = p_conversation;
  INSERT INTO public.ai_conversation_messages(conversation_id, sender, body)
    VALUES(p_conversation, 'visitor', v_note);
  INSERT INTO public.ai_concierge_tasks(conversation_id, task_type, urgency, escalation_due_at)
    VALUES(p_conversation, 'human_handoff', 'urgent', now() + interval '30 minutes')
    ON CONFLICT DO NOTHING;
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION public.ai_concierge_request_human_with_contact(uuid,text,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_concierge_request_human_with_contact(uuid,text,text,text,text,boolean) TO service_role;
