ALTER TABLE portal_feed ADD COLUMN IF NOT EXISTS level  TEXT NOT NULL DEFAULT 'd1';
ALTER TABLE portal_feed ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'on3';
ALTER TABLE portal_feed ADD COLUMN IF NOT EXISTS csv_key TEXT;
ALTER TABLE portal_feed ALTER COLUMN on3_key DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_csv_key
  ON portal_feed(csv_key, level)
  WHERE csv_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_level ON portal_feed(level);
