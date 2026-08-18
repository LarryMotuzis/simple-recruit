-- Add parent/guardian, AAU coach, and HS coach contact fields to prospects.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS parent_name      TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone     TEXT,
  ADD COLUMN IF NOT EXISTS parent_email     TEXT,
  ADD COLUMN IF NOT EXISTS aau_coach_name   TEXT,
  ADD COLUMN IF NOT EXISTS aau_coach_phone  TEXT,
  ADD COLUMN IF NOT EXISTS aau_coach_email  TEXT,
  ADD COLUMN IF NOT EXISTS hs_coach_name    TEXT,
  ADD COLUMN IF NOT EXISTS hs_coach_phone   TEXT,
  ADD COLUMN IF NOT EXISTS hs_coach_email   TEXT;
