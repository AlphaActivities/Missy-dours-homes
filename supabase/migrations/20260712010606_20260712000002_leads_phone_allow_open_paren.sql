/*
  # Update leads anon INSERT phone regex — allow open-paren as first character

  The phone formatter produces values like (402) 555-1234 which begin with '('.
  The previous policy required first char to be digit or '+', so formatted US
  numbers were incorrectly rejected. This migration updates only the phone
  character-set check; all other field rules are unchanged.
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

    -- phone: optional — either empty or valid format
    -- first char: digit, '+', or '(' (formatted US numbers begin with open-paren)
    AND (
      trim(phone) = ''
      OR (
        length(trim(phone)) >= 10
        AND length(trim(phone)) <= 20
        AND trim(phone) ~ '^[+(0-9][0-9 \-()\./]+$'
      )
    )

    -- message: required, 10–2000 trimmed chars
    AND length(trim(message)) >= 10
    AND length(trim(message)) <= 2000
  );
