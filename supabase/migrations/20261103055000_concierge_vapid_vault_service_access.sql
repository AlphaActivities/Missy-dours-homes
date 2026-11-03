-- Preserve the original Oct 30 VAPID key pair; the private key is stored
-- separately in Supabase Vault (encrypted at rest), NEVER in this migration.
-- Only the server-side service role can retrieve it.
CREATE OR REPLACE FUNCTION public.ai_concierge_get_vapid_private()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT decrypted_secret::text
  FROM vault.decrypted_secrets
  WHERE name='missy_concierge_vapid_private'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.ai_concierge_get_vapid_private() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_concierge_get_vapid_private() TO service_role;
