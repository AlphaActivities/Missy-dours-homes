/*
# Add netlify_submission_id column to leads table

## Purpose
Adds a nullable `netlify_submission_id` column to `public.leads` to store the
unique Netlify form submission ID delivered via the verified-submission
webhook. This enables idempotent webhook processing so duplicate webhook
deliveries (retries) cannot create duplicate lead rows.

## Changes
1. New column: `netlify_submission_id` (text, nullable)
   - Nullable so existing rows and manually inserted rows remain valid.
   - Populated only by the Edge Function webhook receiver from the
     Netlify payload's top-level `id` field.

2. New partial unique index: `leads_netlify_submission_id_key`
   - UNIQUE on `netlify_submission_id` WHERE IS NOT NULL.
   - Prevents duplicate rows for the same Netlify submission.
   - Partial (WHERE NOT NULL) so rows without a Netlify ID are unconstrained.

## Security
- No changes to existing RLS policies.
- No changes to authenticated dashboard SELECT/UPDATE access.
- No changes to existing leads columns or status defaults.
- The column is write-accessible through existing INSERT/UPDATE RLS policies
  (it is just another text column on the same table).

## Important Notes
1. This migration is safe to re-run (uses IF NOT EXISTS / DO $$ block).
2. Existing rows are preserved — the new column defaults to NULL.
3. The partial unique index allows multiple NULLs (historical rows).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'netlify_submission_id'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN netlify_submission_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS leads_netlify_submission_id_key
  ON public.leads (netlify_submission_id)
  WHERE netlify_submission_id IS NOT NULL;
