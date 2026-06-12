-- 003_portal_feed.sql
-- Portal feed table — stores scraped transfer portal entries from On3.
-- on3_key is the unique player key from On3's data; used to upsert on re-sync.

CREATE TABLE IF NOT EXISTS portal_feed (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    on3_key              INT  NOT NULL UNIQUE,
    full_name            TEXT NOT NULL,
    position_abbr        TEXT,
    height               TEXT,
    class_rank           TEXT,
    from_school          TEXT,
    to_school            TEXT,
    status               TEXT NOT NULL DEFAULT 'Unknown',
    stars                INT,
    portal_entered_at    TIMESTAMPTZ,
    on3_slug             TEXT,
    scraped_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    imported_prospect_id UUID REFERENCES prospects(id)
);

CREATE INDEX IF NOT EXISTS idx_portal_status   ON portal_feed(status);
CREATE INDEX IF NOT EXISTS idx_portal_position ON portal_feed(position_abbr);
