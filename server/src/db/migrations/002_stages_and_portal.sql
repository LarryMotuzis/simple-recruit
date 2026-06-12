-- 002_stages_and_portal.sql
-- Collapses pipeline stages to three (evaluating, offered, committed) and adds
-- a transfer-portal flag. Assumes test data has been cleared.

-- Clear any existing prospects so the enum swap is safe (no rows reference old values).
DELETE FROM prospects;

-- Recreate the stage enum with the three stages we want.
-- (Default must be dropped before the type can be altered.)
ALTER TABLE prospects ALTER COLUMN stage DROP DEFAULT;

ALTER TYPE pipeline_stage RENAME TO pipeline_stage_old;
CREATE TYPE pipeline_stage AS ENUM ('evaluating', 'offered', 'committed');

ALTER TABLE prospects
    ALTER COLUMN stage TYPE pipeline_stage
    USING stage::text::pipeline_stage;

ALTER TABLE prospects ALTER COLUMN stage SET DEFAULT 'evaluating';

DROP TYPE pipeline_stage_old;

-- Transfer portal flag.
ALTER TABLE prospects
    ADD COLUMN in_portal BOOLEAN NOT NULL DEFAULT FALSE;
