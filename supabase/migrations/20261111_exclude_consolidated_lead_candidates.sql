-- Completed consolidations remain in the historical audit and archived source leads,
-- but cannot be offered to staff as new merge candidates.
-- This function is a read-only candidate lookup and keeps the original staff access gate.
CREATE OR REPLACE FUNCTION public.crm_review_phone_lead_candidates(p_phone text)
 RETURNS TABLE(id uuid, name text, phone text, created_at timestamp with time zone, status text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select l.id,l.name,l.phone,l.created_at,l.status
  from public.leads l
  where lower(coalesce(auth.jwt()->>'email','')) in
    ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com')
    and not exists (
      select 1 from public.crm_lead_consolidations consolidated
      where consolidated.secondary_lead_id = l.id
    )
    and length(regexp_replace(coalesce(p_phone,''),'\D','','g')) between 10 and 11
    and (
      case when length(regexp_replace(coalesce(l.phone,''),'\D','','g'))=11
            and left(regexp_replace(coalesce(l.phone,''),'\D','','g'),1)='1'
        then right(regexp_replace(coalesce(l.phone,''),'\D','','g'),10)
        else regexp_replace(coalesce(l.phone,''),'\D','','g') end
    )=(
      case when length(regexp_replace(coalesce(p_phone,''),'\D','','g'))=11
            and left(regexp_replace(coalesce(p_phone,''),'\D','','g'),1)='1'
        then right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10)
        else regexp_replace(coalesce(p_phone,''),'\D','','g') end
    )
  order by l.created_at desc nulls last,l.id desc
  limit 100
$function$
;
