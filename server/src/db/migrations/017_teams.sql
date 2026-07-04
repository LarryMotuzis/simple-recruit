-- 017_teams.sql
-- Introduce teams so all coaches on the same staff share one roster and settings.

CREATE TABLE teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which team a user belongs to (null = solo / no staff assigned yet)
ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Roster rows are now team-scoped when the owner has a team
ALTER TABLE roster ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Team settings can be owned by a team (takes priority over user_id)
ALTER TABLE team_settings ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_team_settings_team ON team_settings(team_id) WHERE team_id IS NOT NULL;
