/*
# Set up pg_cron + pg_net for automatic Google review sync

1. Extensions
- Install pg_cron (PostgreSQL job scheduler) in the cron schema
- Install pg_net (async HTTP client) in the extensions schema

2. Scheduler
- Create a cron job that runs every 12 hours (at 00:00 and 12:00 UTC)
- The job calls the sync-google-reviews Edge Function via pg_net.http_post
- Uses the project's anon key for auth (public-safe, already in frontend)
- No Google OAuth secrets are exposed in SQL

3. Security
- No Google credentials in SQL
- No service-role key in SQL
- The anon key is public-safe (already in the frontend bundle)
- The Edge Function holds Google secrets server-side only
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA extensions TO postgres;

-- Drop the job if it already exists, then recreate (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-reviews-twice-daily') THEN
    PERFORM cron.unschedule('sync-google-reviews-twice-daily');
  END IF;
END $$;

-- Schedule the sync job every 12 hours at 00:00 and 12:00 UTC
SELECT cron.schedule(
  'sync-google-reviews-twice-daily',
  '0 0,12 * * *',
  $$
    SELECT extensions.net.http_post(
      url := 'https://upcnhyzqdnzcczxlxqxz.supabase.co/functions/v1/sync-google-reviews',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
