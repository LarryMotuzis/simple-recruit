CREATE TABLE team_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name       TEXT NOT NULL DEFAULT 'My Team',
  abbreviation    TEXT NOT NULL DEFAULT 'TEAM',
  primary_color   TEXT NOT NULL DEFAULT '#1e40af',
  secondary_color TEXT NOT NULL DEFAULT '#ffffff',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with Lewis Flyers
INSERT INTO team_settings (team_name, abbreviation, primary_color, secondary_color)
VALUES ('Lewis Flyers', 'FLYERS', '#CC0000', '#ffffff');
