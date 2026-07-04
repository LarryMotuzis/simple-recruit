-- 011_per_user_roster.sql
-- Scope roster and team_settings to individual users so each coach manages their own team.

-- Add user_id to roster (nullable to preserve any existing rows)
ALTER TABLE roster ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to team_settings; each user gets one settings row
ALTER TABLE team_settings ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_team_settings_user ON team_settings(user_id) WHERE user_id IS NOT NULL;
