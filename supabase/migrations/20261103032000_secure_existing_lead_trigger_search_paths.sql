-- Applied to production Supabase and security advisor warnings cleared.
-- Both triggers reference only NEW/OLD and pg_catalog built-ins.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.protect_lead_immutable_fields() SET search_path = '';
