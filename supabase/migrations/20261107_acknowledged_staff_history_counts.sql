-- A staff-completion update enters History when acknowledged, not before.
CREATE OR REPLACE FUNCTION public.crm_activity_totals()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      OR ((e.event_key LIKE 'staff:completed:%' OR e.event_key LIKE 'staff:claimed:%') AND r.read_at IS NOT NULL) OR (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id)))
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
END $function$;
