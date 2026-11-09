-- Trigger functions are called by Postgres triggers, never by the public Data API.
-- Existing triggers continue firing; remove direct RPC execute permissions.
REVOKE EXECUTE ON FUNCTION public.crm_guard_callback_task_completion() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_guard_lead_contact_stage() FROM PUBLIC,anon,authenticated;
