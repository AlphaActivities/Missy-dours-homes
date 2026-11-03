-- Supabase flags any authenticated caller's EXECUTE on a security-definer
-- function. Replace the provisional RPC with a verified JWT-only Edge route.
-- Staff readiness will be aggregated server-side; no browser SQL privileges.
DROP FUNCTION IF EXISTS public.ai_concierge_team_push_readiness();
