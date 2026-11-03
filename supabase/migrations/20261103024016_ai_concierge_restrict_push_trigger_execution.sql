-- Applied in production Supabase as migration 20261103024016.
-- The function is invoked by a database trigger and is not a public RPC.
-- Keep the privileged trigger execution unavailable to browser roles.
REVOKE EXECUTE ON FUNCTION public.ai_concierge_queue_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_concierge_queue_push() TO service_role;
