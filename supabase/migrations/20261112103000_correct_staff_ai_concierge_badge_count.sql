-- The linked AI Concierge lead audit exclusion applies ONLY to lead events.
-- Staff stage/archive actions must remain counted until dismissed/read.
CREATE OR REPLACE FUNCTION public.crm_grouped_activity_counts(p_staff_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE v_staff text:=lower(coalesce(p_staff_email,''));
DECLARE v_role text:=coalesce(auth.jwt()->>'role','');
BEGIN
 IF v_staff NOT IN ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com')
    OR (v_role IS DISTINCT FROM 'service_role' AND lower(coalesce(auth.jwt()->>'email','')) IS DISTINCT FROM v_staff)
 THEN RAISE EXCEPTION 'not authorized'; END IF;
 RETURN (
  WITH annotated AS (
   SELECT e.id,e.category,e.created_at,r.read_at,r.archived_at,
    CASE WHEN ht.id IS NOT NULL THEN 'customer:'||coalesce(c.lead_id::text,'conversation:'||ht.conversation_id::text)
         ELSE 'event:'||e.id::text END AS group_key,
    (r.archived_at IS NULL AND (e.category='staff' OR NOT coalesce(l.status='archived',false))
     AND (e.category='staff' OR NOT coalesce(linked_lead.status='archived',false))
     AND NOT (e.category='staff' AND r.read_at IS NOT NULL AND (e.event_key LIKE 'staff:archive:%' OR e.event_key LIKE 'staff:stage:%'))
     AND e.event_key NOT LIKE 'staff:completed:%' AND e.event_key NOT LIKE 'staff:claimed:%'
     AND (ht.id IS NULL OR ht.status NOT IN ('completed','cancelled'))
     AND (e.category<>'opportunity' OR oc.status='ai')
     AND NOT (
      (e.category='handoff' AND ht.escalated_at IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.crm_activity_events u WHERE u.event_key='escalation:'||ht.id::text))
      OR (e.category='escalation' AND (ht.id IS NULL OR ht.escalated_at IS NULL)))
     AND NOT (e.category='lead' AND coalesce(l.source_page='AI Concierge',false) AND EXISTS(
      SELECT 1 FROM public.ai_conversations linked WHERE linked.lead_id=l.id))
    ) AS is_active,
    (e.category='escalation' AND ht.escalated_at IS NOT NULL) AS is_urgent,
    (r.archived_at IS NOT NULL OR (e.category<>'staff' AND coalesce(l.status='archived',false))
     OR (e.category<>'staff' AND coalesce(linked_lead.status='archived',false))
     OR (e.category='staff' AND r.read_at IS NOT NULL AND (e.event_key LIKE 'staff:archive:%' OR e.event_key LIKE 'staff:stage:%'))
     OR ((e.event_key LIKE 'staff:completed:%' OR e.event_key LIKE 'staff:claimed:%') AND r.read_at IS NOT NULL)
     OR (ht.status IN ('completed','cancelled'))
     OR (e.category='opportunity' AND oc.status<>'ai')
     OR (coalesce(l.source_page='AI Concierge',false) AND EXISTS(
      SELECT 1 FROM public.ai_conversations linked WHERE linked.lead_id=l.id))) AS is_hidden
   FROM public.crm_activity_events e
   LEFT JOIN public.crm_activity_receipts r ON r.event_id=e.id AND r.staff_email=v_staff
   LEFT JOIN public.leads l ON e.target_path='/dashboard/leads?lead='||l.id::text
   LEFT JOIN public.ai_concierge_tasks ht ON (e.event_key='handoff:'||ht.id::text OR e.event_key='escalation:'||ht.id::text)
   LEFT JOIN public.ai_conversations c ON c.id=ht.conversation_id
   LEFT JOIN public.leads linked_lead ON linked_lead.id=c.lead_id
   LEFT JOIN public.ai_conversations oc ON e.event_key='opportunity:'||oc.id::text
   WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_activity_events canonical
    WHERE e.event_key='lead:existing:'||l.id::text
      AND canonical.event_key='lead:'||l.id::text
      AND canonical.category='lead' AND canonical.target_path=e.target_path)
  )
  SELECT jsonb_build_object(
   'total',count(DISTINCT group_key) FILTER(WHERE is_active),
   'unread',count(DISTINCT group_key) FILTER(WHERE is_active AND read_at IS NULL),
   'urgent',count(DISTINCT group_key) FILTER(WHERE is_active AND is_urgent),
   'today',count(DISTINCT group_key) FILTER(WHERE is_active AND created_at>=now()-interval '24 hours'),
   'hidden',count(*) FILTER(WHERE is_hidden)
  ) FROM annotated
 );
END $fn$;