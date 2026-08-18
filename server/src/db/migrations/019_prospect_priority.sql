-- Add a manual 1-5 priority rating coaches use to rank prospects.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS priority SMALLINT CHECK (priority BETWEEN 1 AND 5);
