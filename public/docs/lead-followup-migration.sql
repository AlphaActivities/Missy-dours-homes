-- ════════════════════════════════════════════════════════════════
-- LEAD FOLLOW-UP MANAGEMENT — OFFICIAL PROJECT MIGRATION
-- Target: ddgpsvkmrnfeufepowog (run in Supabase Dashboard > SQL Editor)
-- DO NOT run on aftmtqwomwibfpfaavya (obsolete project)
-- ════════════════════════════════════════════════════════════════
-- Idempotent, non-destructive. Safe to re-run.
-- Adds: last_contacted_at column, lead_followups, lead_activities,
-- lead_contact_events tables with RLS for approved admins only.
-- ════════════════════════════════════════════════════════════════

-- 1. Add last_contacted_at to leads (nullable, preserves existing data)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- 2. lead_followups table
CREATE TABLE IF NOT EXISTS lead_followups (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  due_at       timestamptz NOT NULL,
  task         text        NOT NULL DEFAULT 'Follow up',
  status       text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  completed_at timestamptz,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_status_due ON lead_followups(status, due_at);

ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved admins select lead followups" ON lead_followups;
CREATE POLICY "approved admins select lead followups" ON lead_followups FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

DROP POLICY IF EXISTS "approved admins insert lead followups" ON lead_followups;
CREATE POLICY "approved admins insert lead followups" ON lead_followups FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

DROP POLICY IF EXISTS "approved admins update lead followups" ON lead_followups;
CREATE POLICY "approved admins update lead followups" ON lead_followups FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

DROP POLICY IF EXISTS "approved admins delete lead followups" ON lead_followups;
CREATE POLICY "approved admins delete lead followups" ON lead_followups FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

-- 3. lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,
  description text        NOT NULL,
  actor       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved admins select lead activities" ON lead_activities;
CREATE POLICY "approved admins select lead activities" ON lead_activities FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

DROP POLICY IF EXISTS "approved admins insert lead activities" ON lead_activities;
CREATE POLICY "approved admins insert lead activities" ON lead_activities FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

-- 4. lead_contact_events table
CREATE TABLE IF NOT EXISTS lead_contact_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel      text        NOT NULL CHECK (channel IN ('call','text','email')),
  notes        text        NOT NULL DEFAULT '',
  contacted_by text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_contact_events_lead_id ON lead_contact_events(lead_id);

ALTER TABLE lead_contact_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved admins select lead contact events" ON lead_contact_events;
CREATE POLICY "approved admins select lead contact events" ON lead_contact_events FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));

DROP POLICY IF EXISTS "approved admins insert lead contact events" ON lead_contact_events;
CREATE POLICY "approved admins insert lead contact events" ON lead_contact_events FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IN ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'));
