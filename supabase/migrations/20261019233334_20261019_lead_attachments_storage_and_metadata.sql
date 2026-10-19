/*
# Lead attachments — private storage bucket + metadata table

## Summary
Adds secure, private per-lead file attachments (photos and documents)
for approved dashboard admins. Files are stored in a dedicated PRIVATE
Supabase Storage bucket and are never publicly accessible. Access is
gated by the same approved-admin email allowlist used for the leads
table. A metadata table records each attachment and ties it to a lead.

## Supported Formats
JPG, JPEG, PNG, WEBP, PDF, DOC, DOCX. 10 MB max per file.

## New Storage Bucket
- `lead-attachments` — PRIVATE (public = false)
  - 10 MB file size limit
  - MIME-type restriction to supported formats
  - Files organized by lead id + collision-resistant uuid, never by
    customer name or personal email

## New Tables
- `lead_attachments`
  - `id` — UUID primary key
  - `lead_id` — UUID, references leads(id) ON DELETE CASCADE
  - `storage_path` — text, the path within the lead-attachments bucket
  - `original_filename` — text, the user-facing filename at upload
  - `mime_type` — text, the file MIME type
  - `file_size` — bigint, bytes
  - `uploaded_by` — text, uploader email (from JWT)
  - `created_at` — timestamptz

## Security
- `lead_attachments` RLS enabled, default deny
- SELECT / INSERT / DELETE restricted to approved admin emails
  (same allowlist as leads: missydourshomes@gmail.com,
   yourcustomerflowguy@gmail.com, heberherrera92@gmail.com)
- No UPDATE policy — attachment metadata is immutable once created
- Storage RLS policies (on storage.objects) restricted to the
  lead-attachments bucket and the same approved admin allowlist for
  SELECT / INSERT / DELETE
- Bucket is private; anon has no access
- Foreign key with ON DELETE CASCADE ensures metadata is removed
  if a lead is ever deleted (currently no DELETE policy on leads,
  but the constraint prevents dangling references)

## Notes
1. Service-role credentials are never used in the frontend. All
   client operations use the authenticated user's session.
2. Storage paths use `<lead_id>/<uuid>.<ext>` to avoid collisions
   and prevent guessing by customer name.
3. No public read access is granted at any level.
*/

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-attachments',
  'lead-attachments',
  false,
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

-- ============================================================
-- STORAGE RLS POLICIES (storage.objects)
-- ============================================================

-- Approved admins can read/download objects in lead-attachments
DROP POLICY IF EXISTS "approved admins read lead attachments" ON storage.objects;
CREATE POLICY "approved admins read lead attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lead-attachments'
    AND (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

-- Approved admins can upload objects to lead-attachments
DROP POLICY IF EXISTS "approved admins upload lead attachments" ON storage.objects;
CREATE POLICY "approved admins upload lead attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lead-attachments'
    AND (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

-- Approved admins can delete objects in lead-attachments
DROP POLICY IF EXISTS "approved admins delete lead attachments" ON storage.objects;
CREATE POLICY "approved admins delete lead attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lead-attachments'
    AND (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

-- ============================================================
-- METADATA TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_attachments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  storage_path      text        NOT NULL,
  original_filename text        NOT NULL,
  mime_type         text        NOT NULL,
  file_size         bigint      NOT NULL,
  uploaded_by       text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id
  ON lead_attachments(lead_id);

ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;

-- Approved admins can view attachment metadata
DROP POLICY IF EXISTS "approved admins view lead attachments metadata" ON lead_attachments;
CREATE POLICY "approved admins view lead attachments metadata"
  ON lead_attachments
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

-- Approved admins can create attachment metadata
DROP POLICY IF EXISTS "approved admins insert lead attachments metadata" ON lead_attachments;
CREATE POLICY "approved admins insert lead attachments metadata"
  ON lead_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

-- Approved admins can delete attachment metadata
DROP POLICY IF EXISTS "approved admins delete lead attachments metadata" ON lead_attachments;
CREATE POLICY "approved admins delete lead attachments metadata"
  ON lead_attachments
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'missydourshomes@gmail.com',
      'yourcustomerflowguy@gmail.com',
      'heberherrera92@gmail.com'
    )
  );

-- No UPDATE policy: attachment metadata is immutable once created.
