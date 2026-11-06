-- Individual, authorized per-staff foreground notification sound preferences.
-- Preserve all existing push registrations and notification settings.
ALTER TABLE public.crm_notification_preferences
 ADD COLUMN IF NOT EXISTS sound_lead text NOT NULL DEFAULT 'crystal',
 ADD COLUMN IF NOT EXISTS sound_handoff text NOT NULL DEFAULT 'signature',
 ADD COLUMN IF NOT EXISTS sound_escalation text NOT NULL DEFAULT 'executive',
 ADD COLUMN IF NOT EXISTS sound_staff text NOT NULL DEFAULT 'soft';

ALTER TABLE public.crm_notification_preferences
 ADD CONSTRAINT sound_lead_valid CHECK(sound_lead IN ('signature','crystal','executive','soft','silent')),
 ADD CONSTRAINT sound_handoff_valid CHECK(sound_handoff IN ('signature','crystal','executive','soft','silent')),
 ADD CONSTRAINT sound_escalation_valid CHECK(sound_escalation IN ('signature','crystal','executive','soft','silent')),
 ADD CONSTRAINT sound_staff_valid CHECK(sound_staff IN ('signature','crystal','executive','soft','silent'));
