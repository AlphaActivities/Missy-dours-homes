-- Align native iOS push badges with CRM All filter, per authorized staff account.
-- This is the same active-card filtering expression as crm_activity_totals().total;
-- do not count leads, tasks, and waiting conversations separately.
create or replace function public.crm_visible_notification_count_service(p_staff_email text)
returns integer language plpgsql stable security definer set search_path to ''
as $fn$
declare v_total integer;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'service role required'; end if;
 if lower(coalesce(p_staff_email,'')) not in ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com') then raise exception 'unknown staff'; end if;
 select count(*) filter(where r.archived_at IS NULL AND NOT coalesce(l.status='archived',false)
      AND e.event_key NOT LIKE 'staff:completed:%' AND e.event_key NOT LIKE 'staff:claimed:%'
      AND (ht.id IS NULL OR ht.status NOT IN ('completed','cancelled')) AND (e.category<>'opportunity' OR oc.status='ai')
      AND NOT (
       (e.category='handoff' AND ht.escalated_at IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.crm_activity_events u WHERE u.event_key='escalation:'||ht.id::text
       )) OR
       (e.category='escalation' AND (ht.id IS NULL OR ht.escalated_at IS NULL))
      ) AND NOT (coalesce(l.source_page='AI Concierge',false) AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.lead_id=l.id)))
 into v_total
  FROM public.crm_activity_events e
 LEFT JOIN public.crm_activity_receipts r ON r.event_id=e.id AND r.staff_email=lower(p_staff_email)
 LEFT JOIN public.leads l ON e.target_path='/dashboard/leads?lead='||l.id::text
 LEFT JOIN public.ai_conversations oc ON e.event_key='opportunity:'||oc.id::text LEFT JOIN public.ai_concierge_tasks ht ON (e.event_key='handoff:'||ht.id::text OR e.event_key='escalation:'||ht.id::text)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.crm_activity_events canonical
   WHERE e.event_key='lead:existing:'||l.id::text
     AND canonical.event_key='lead:'||l.id::text
     AND canonical.category='lead' AND canonical.target_path=e.target_path
 );
 return coalesce(v_total,0);
end;
$fn$;
revoke all on function public.crm_visible_notification_count_service(text) from public, anon, authenticated;
grant execute on function public.crm_visible_notification_count_service(text) to service_role;
