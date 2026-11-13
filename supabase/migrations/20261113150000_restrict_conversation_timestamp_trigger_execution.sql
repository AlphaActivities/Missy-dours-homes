-- Mirrors the already-applied production permission hardening.
-- The trigger still executes internally; direct client RPC access is unnecessary.
REVOKE EXECUTE ON FUNCTION public.crm_sync_conversation_latest_message() FROM PUBLIC, anon, authenticated;
