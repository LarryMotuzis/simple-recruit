ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS prospect_type TEXT NOT NULL DEFAULT 'high_school'
    CHECK (prospect_type IN ('high_school', 'transfer', 'juco'));

-- Seed existing portal entries as transfer
UPDATE prospects SET prospect_type = 'transfer' WHERE in_portal = true;
