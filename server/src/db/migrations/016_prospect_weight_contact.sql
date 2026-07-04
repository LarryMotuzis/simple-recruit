-- 016_prospect_weight_contact.sql
-- Add weight, phone, and email contact fields to prospects.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS weight_lbs    INT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;
