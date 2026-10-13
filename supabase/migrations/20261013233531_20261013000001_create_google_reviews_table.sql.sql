/*
# Create google_reviews table for cached Google Business Profile reviews

1. New Tables
- `google_reviews`
  - `id` (uuid, primary key)
  - `google_review_id` (text, unique, not null) — Google's unique review identifier
  - `reviewer_name` (text, nullable) — display name of the reviewer
  - `reviewer_profile_photo_url` (text, nullable) — profile photo URL if available
  - `star_rating` (integer, nullable) — 1-5 star rating
  - `comment` (text, nullable) — review text body
  - `review_created_at` (timestamptz, nullable) — original creation timestamp from Google
  - `review_updated_at` (timestamptz, nullable) — last update timestamp from Google
  - `owner_reply` (text, nullable) — owner response text if present
  - `owner_reply_updated_at` (timestamptz, nullable) — when the owner reply was last updated
  - `is_displayable` (boolean, not null, default true) — whether to show on website
  - `synced_at` (timestamptz, not null, default now()) — last successful sync time
  - `created_at` (timestamptz, default now()) — row creation time
  - `updated_at` (timestamptz, default now()) — row last modified time

2. Security
- Enable RLS on `google_reviews`.
- Anonymous/authenticated users can SELECT only displayable reviews (is_displayable = true).
- No anonymous INSERT, UPDATE, or DELETE — only the service role (backend sync) can write.
- The service role bypasses RLS, so the Edge Function sync works without additional policies.

3. Indexes
- Unique index on `google_review_id` to prevent duplicate reviews.
- Index on `is_displayable` for efficient public queries.
*/

CREATE TABLE IF NOT EXISTS google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_review_id text UNIQUE NOT NULL,
  reviewer_name text,
  reviewer_profile_photo_url text,
  star_rating integer,
  comment text,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  owner_reply text,
  owner_reply_updated_at timestamptz,
  is_displayable boolean NOT NULL DEFAULT true,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_displayable_reviews" ON google_reviews;
CREATE POLICY "public_select_displayable_reviews"
ON google_reviews FOR SELECT
TO anon, authenticated
USING (is_displayable = true);

CREATE INDEX IF NOT EXISTS idx_google_reviews_is_displayable ON google_reviews (is_displayable);
