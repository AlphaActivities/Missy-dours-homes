-- Preserve meaningful word boundaries during callback identity matching.
-- "(JOSH TEST)" and "JOSH TEST)" match; "Mary Ann" and "Maryann" do not.
-- This helper is used by intake for unique, same-phone active candidates.
create or replace function public.crm_normalize_identity_name(p_name text)
returns text language sql immutable strict set search_path to ''
as $identity$
 select btrim(regexp_replace(
   regexp_replace(lower(btrim(p_name)), '[^[:alnum:][:space:]]+', ' ', 'g'),
   '[[:space:]]+', ' ', 'g'))
$identity$;
revoke all on function public.crm_normalize_identity_name(text) from public;
grant execute on function public.crm_normalize_identity_name(text) to anon,authenticated,service_role;
