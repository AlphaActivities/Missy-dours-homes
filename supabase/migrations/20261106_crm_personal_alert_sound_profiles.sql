-- Individual, authorized per-staff foreground notification sound preferences.
-- Preserve all existing push registrations and notification settings.
ALTER TABLE public.crm_notification_preferences
 ADD COLUMN IF NOT EXISTS sound_lead text NOT NULL DEFAULT 'crystal',
 ADD COLUMN IF NOT EXISTS sound_handoff text NOT NULL DEFAULT 'signature',
 ADD COLUMN IF NOT EXISTS sound_escalation text NOT NULL DEFAULT 'executive',
 ADD COLUMN IF NOT EXISTS sound_staff text NOT NULL DEFAULT 'soft';

-- Idempotent if this tracked migration is run after a manual rollout.
DO $$
DECLARE column_name text;
BEGIN
 FOREACH column_name IN ARRAY ARRAY[
  'sound_lead','sound_handoff','sound_escalation','sound_staff'
 ] LOOP
  IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid='public.crm_notification_preferences'::regclass
     AND conname=column_name||'_valid'
  ) THEN
   EXECUTE format(
    'ALTER TABLE public.crm_notification_preferences ADD CONSTRAINT %I CHECK (%I IN (''signature'',''crystal'',''executive'',''soft'',''silent''))',
    column_name||'_valid',column_name
   );
  END IF;
 END LOOP;
END $$;
