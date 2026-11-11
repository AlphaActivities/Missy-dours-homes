-- The grouped count is an internal helper invoked by the authorized CRM count
-- wrapper and service-role push badge function. Do not expose it as a separate
-- authenticated RPC surface; the wrappers retain their existing authorization.
REVOKE ALL ON FUNCTION public.crm_grouped_activity_counts(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_grouped_activity_counts(text) TO service_role;
