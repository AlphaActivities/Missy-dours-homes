-- Phone-only candidate lookup, bounded, sorted newest first.
-- Authorization is enforced by both the explicit staff allowlist and leads RLS.
-- A matching number is NOT sufficient proof of identity.
create or replace function public.crm_review_phone_lead_candidates(p_phone text)
returns table(id uuid,name text,phone text,created_at timestamptz,status text)
language sql stable security invoker set search_path to ''
as $fn$
  select l.id,l.name,l.phone,l.created_at,l.status
  from public.leads l
  where lower(coalesce(auth.jwt()->>'email','')) in
    ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com')
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
$fn$;
revoke all on function public.crm_review_phone_lead_candidates(text) from public,anon;
grant execute on function public.crm_review_phone_lead_candidates(text) to authenticated;
