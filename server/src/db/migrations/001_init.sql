-- 001_init.sql — Simple Recruit initial schema

-- ============ USERS & AUTH ============
CREATE TYPE user_role AS ENUM ('head_coach', 'assistant', 'viewer');

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'viewer',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PROSPECTS ============
CREATE TYPE pipeline_stage AS ENUM (
    'identified', 'contacted', 'evaluating', 'offered', 'committed', 'closed'
);

CREATE TABLE prospects (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name      TEXT NOT NULL,
    position       TEXT,
    grad_year      INT,
    height_inches  INT,
    region         TEXT,
    current_school TEXT,
    stage          pipeline_stage NOT NULL DEFAULT 'identified',
    stage_order    INT NOT NULL DEFAULT 0,
    is_archived    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_stage  ON prospects(stage) WHERE is_archived = FALSE;
CREATE INDEX idx_prospects_gradyr ON prospects(grad_year);

-- ============ EVALUATIONS ============
CREATE TABLE evaluations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id),
    eval_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 10),
    notes       TEXT,
    tags        TEXT[],
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_prospect ON evaluations(prospect_id);

-- ============ STAT ENTRIES ============
CREATE TABLE stat_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id  UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    game_date    DATE NOT NULL,
    points       INT DEFAULT 0,
    assists      INT DEFAULT 0,
    rebounds     INT DEFAULT 0,
    fg_made      INT DEFAULT 0,
    fg_attempted INT DEFAULT 0,
    minutes      INT DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stats_prospect ON stat_entries(prospect_id);

-- ============ AUDIT LOG ============
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    action      TEXT NOT NULL,
    field       TEXT,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor  ON audit_log(actor_id);
