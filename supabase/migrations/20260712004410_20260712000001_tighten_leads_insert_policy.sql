/*
  # Tighten leads anon INSERT policy

  Replaces the permissive WITH CHECK (true) policy with field-level validation
  that mirrors the approved frontend rules. Prevents blank or invalid submissions
  from being stored in the leads table even when the contact form interface is
  bypassed.

  Rules enforced:
  - name:    trimmed length 2–100
  - email:   trimmed length ≤ 255, valid email format (case-insensitive)
  - phone:   either empty string OR trimmed length 10–20 AND permitted characters only
             (first char must be digit or '+'; remaining chars: digits, spaces,
             hyphens, parentheses, periods, forward slashes)
  - message: trimmed length 10–2000

  No other policies, tables, triggers, or functions are modified.
*/

DROP POLICY IF EXISTS "anon can insert leads" ON leads;

CREATE POLICY "anon can insert leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (
    -- name: required, 2–100 trimmed chars
    length(trim(name)) >= 2
    AND length(trim(name)) <= 100

    -- email: required, valid format, ≤ 255 trimmed chars
    AND length(trim(email)) <= 255
    AND trim(email) ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'

    -- phone: optional — either empty or valid format with permitted chars
    AND (
      trim(phone) = ''
      OR (
        length(trim(phone)) >= 10
        AND length(trim(phone)) <= 20
        AND trim(phone) ~ '^[+0-9][0-9 \-()\./]+$'
      )
    )

    -- message: required, 10–2000 trimmed chars
    AND length(trim(message)) >= 10
    AND length(trim(message)) <= 2000
  );
