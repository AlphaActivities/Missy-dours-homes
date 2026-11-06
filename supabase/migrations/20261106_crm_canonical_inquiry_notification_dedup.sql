-- Missy Dours CRM: present one canonical notification per original lead inquiry.
-- Preserve ALL stored activity events and individual staff read/hidden receipts.
-- An obsolete "lead:existing:<lead_id>" backfill card is redundant ONLY when
-- the matching canonical "lead:<lead_id>" card exists for that exact lead.
-- Follow-ups, staff updates, escalations, and genuine reopen events remain distinct.
-- Apply the same predicate before pagination AND all server-side badge totals.

CREATE OR REPLACE FUNCTION public.crm_activity_page(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  event_key text,
  category text,
  title text,
  summary text,
  target_path text,
  created_at timestamptz,
  read_at timestamptz,
  archived_at timestamptz,
  lead_archived boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  staff text := lower(coalesce(auth.jwt()->>'email',''));
BEGIN
  IF staff NOT IN ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_offset < 0 OR p_offset > 50000 OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid page bounds';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.event_key,
    e.category,
    CASE WHEN e.event_key = 'lead:' || l.id::text
      THEN 'New Lead Received'::text
      ELSE e.title
    END AS title,
    e.summary,
    e.target_path,
    e.created_at,
    r.read_at,
    r.archived_at,
    coalesce(l.status = 'archived', false) AS lead_archived
  FROM public.crm_activity_events e
  LEFT JOIN public.crm_activity_receipts r
    ON r.event_id = e.id AND r.staff_email = staff
  LEFT JOIN public.leads l
    ON e.target_path = '/dashboard/leads?lead=' || l.id::text
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.crm_activity_events canonical
    WHERE e.event_key = 'lead:existing:' || l.id::text
      AND canonical.event_key = 'lead:' || l.id::text
      AND canonical.category = 'lead'
      AND canonical.target_path = e.target_path
  )
  ORDER BY e.created_at DESC, e.id DESC
  OFFSET p_offset LIMIT p_limit;
END
$function$;

CREATE OR REPLACE FUNCTION public.crm_activity_totals()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  staff text := lower(coalesce(auth.jwt()->>'email',''));
BEGIN
  IF staff NOT IN ('yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'total', count(*) FILTER (
        WHERE r.archived_at IS NULL AND NOT coalesce(l.status='archived',false)
      ),
      'unread', count(*) FILTER (
        WHERE r.archived_at IS NULL AND r.read_at IS NULL
          AND NOT coalesce(l.status='archived',false)
      ),
      'urgent', count(*) FILTER (
        WHERE r.archived_at IS NULL AND e.category='escalation'
          AND NOT coalesce(l.status='archived',false)
      ),
      'today', count(*) FILTER (
        WHERE r.archived_at IS NULL AND e.created_at >= now()-interval '24 hours'
          AND NOT coalesce(l.status='archived',false)
      ),
      'hidden', count(*) FILTER (
        WHERE r.archived_at IS NOT NULL OR coalesce(l.status='archived',false)
      )
    )
    FROM public.crm_activity_events e
    LEFT JOIN public.crm_activity_receipts r
      ON r.event_id=e.id AND r.staff_email=staff
    LEFT JOIN public.leads l
      ON e.target_path='/dashboard/leads?lead=' || l.id::text
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.crm_activity_events canonical
      WHERE e.event_key = 'lead:existing:' || l.id::text
        AND canonical.event_key = 'lead:' || l.id::text
        AND canonical.category = 'lead'
        AND canonical.target_path = e.target_path
    )
  );
END
$function$;

REVOKE ALL ON FUNCTION public.crm_activity_page(integer,integer) FROM public,anon;
REVOKE ALL ON FUNCTION public.crm_activity_totals() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.crm_activity_page(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_activity_totals() TO authenticated;
