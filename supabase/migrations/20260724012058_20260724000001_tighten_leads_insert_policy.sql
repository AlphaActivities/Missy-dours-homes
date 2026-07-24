/*
  # Tighten anonymous leads INSERT policy

  Adds server-side enforcement for source_page, listing_slug, status, and notes
  on anonymous inserts. Preserves all existing name/email/phone/message checks.
  Does NOT modify authenticated SELECT or UPDATE policies.
*/

DROP POLICY IF EXISTS "anon can insert leads" ON leads;

CREATE POLICY "anon can insert leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (
    -- name: required, 2–100 trimmed chars, raw length ≤ 100
    length(trim(name)) >= 2
    AND length(trim(name)) <= 100
    AND length(name) <= 100

    -- email: required, valid format, ≤ 255 trimmed chars, raw length ≤ 255
    AND length(trim(email)) <= 255
    AND length(email) <= 255
    AND trim(email) ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'

    -- phone: optional — either empty or valid format, raw length ≤ 20
    AND (
      trim(phone) = ''
      OR (
        length(trim(phone)) >= 10
        AND length(trim(phone)) <= 20
        AND length(phone) <= 20
        AND trim(phone) ~ '^[+(0-9][0-9 \-()\./]+$'
      )
    )

    -- message: required, 10–2000 trimmed chars, raw length ≤ 2000
    AND length(trim(message)) >= 10
    AND length(trim(message)) <= 2000
    AND length(message) <= 2000

    -- source_page: raw length ≤ 200
    AND length(source_page) <= 200

    -- listing_slug: raw length ≤ 200
    AND length(listing_slug) <= 200

    -- status: anon inserts must use the default 'new'
    AND status = 'new'

    -- notes: anon cannot seed notes
    AND notes = ''
  );
