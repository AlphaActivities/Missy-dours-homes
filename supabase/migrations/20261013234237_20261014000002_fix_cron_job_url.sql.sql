/*
# Fix cron job URL for Google review sync

The previous migration used the wrong Supabase project URL.
This updates the cron job to use the correct project URL and
embeds the anon key directly (public-safe, already in frontend bundle).

Security:
- No Google OAuth secrets in SQL
- No service-role key in SQL
- The anon key is public-safe (already exposed in the frontend bundle)
- The Edge Function holds Google secrets server-side only
- verify_jwt is false on the Edge Function, so anon key is accepted
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-reviews-twice-daily') THEN
    PERFORM cron.unschedule('sync-google-reviews-twice-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-google-reviews-twice-daily',
  '0 0,12 * * *',
  $$
    SELECT extensions.net.http_post(
      url := 'https://aftmtqwomwibfpfaavya.supabase.co/functions/v1/sync-google-reviews',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdG10cXdvbXdpYmZwZmFhdmF5YSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYzODI5OTI5LCJleHAiOjIwNzk0MDU5Mjl9.zNh-Xu7bug2EBsDfmlvSC8RCCyn5akf7mCSmM7GfPsw'
      ),
      body := '{}'::jsonb
    );
  $$
);
