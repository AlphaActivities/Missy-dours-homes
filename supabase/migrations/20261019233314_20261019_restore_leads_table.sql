/*
# Restore leads table (unintentional drop recovery)

## Context
The migration `20260724092217_20260724040000_drop_old_leads_table.sql`
was intended to drop an unused leads table from the OLD Bolt-managed
project (aftmtqwomwibfpfaavya), but it was also applied to the
production project ddgpsvkmrnfeufepowog, removing the leads table
that the dashboard CRM depends on. This migration restores the
leads table with the exact schema and RLS policies defined in the
original Phase 1 foundation migration (`20260510091316`).

## New Tables
- `leads`
  - `id` — UUID primary key, auto-generated
  - `created_at` — submission timestamp, immutable after insert
  - `updated_at` — auto-updated on any row change via trigger
  - `name` — submitted full name, immutable after insert
  - `email` — submitted email address, immutable after insert
  - `phone` — submitted phone number, immutable after insert
  - `message` — submitted message body, immutable after insert
  - `source_page` — pathname at time of submission, immutable after insert
  - `listing_slug` — extracted slug if submitted from a listing page
  - `status` — management field; constrained to: new | contacted | qualified | closed | archived
  - `notes` — management field, free text

## Triggers
- `leads_set_updated_at` — keeps updated_at current on every UPDATE
- `leads_protect_immutable_fields` — raises exception if any submitted field is modified after insert

## Security
- RLS enabled: default deny for all roles
- anon role: INSERT only (website contact form submissions)
- authenticated role: restricted to approved email allowlist
- Approved users: SELECT all leads
- Approved users: UPDATE status and notes only (trigger enforces field restriction)
- No DELETE policy — leads archived via status field only

## Approved Dashboard Users
1. missydourshomes@gmail.com
2. yourcustomerflowguy@gmail.com
3. heberherrera92@gmail.com
*/

CREATE TABLE IF NOT EXISTS leads (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  name          text        NOT NULL DEFAULT '',
  email         text        NOT NULL DEFAULT '',
  phone         text        NOT NULL DEFAULT '',
  message       text        NOT NULL DEFAULT '',
  source_page   text        NOT NULL DEFAULT '',
  listing_slug  text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'archived')),
  notes         text        NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION protect_lead_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name          IS DISTINCT FROM OLD.name          OR
     NEW.email         IS DISTINCT FROM OLD.email         OR
     NEW.phone         IS DISTINCT FROM OLD.phone         OR
     NEW.message       IS DISTINCT FROM OLD.message       OR
     NEW.source_page   IS DISTINCT FROM OLD.source_page   OR
     NEW.listing_slug  IS DISTINCT FROM OLD.listing_slug  OR
     NEW.created_at    IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Submitted lead fields are immutable and cannot be modified after insert.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_protect_immutable_fields ON leads;
CREATE TRIGGER leads_protect_immutable_fields
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION protect_lead_immutable_fields();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can insert leads" ON leads;
CREATE POLICY "anon can insert leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "approved users can view leads" ON leads;
CREATE POLICY "approved users can view leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

DROP POLICY IF EXISTS "approved users can update lead management fields" ON leads;
CREATE POLICY "approved users can update lead management fields"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );
