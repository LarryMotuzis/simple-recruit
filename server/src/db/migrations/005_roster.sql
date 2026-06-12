CREATE TABLE roster (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  position      TEXT,
  jersey_number TEXT,
  year          TEXT,
  height_inches INT,
  notes         TEXT,
  prospect_id   UUID REFERENCES prospects(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE depth_chart (
  position    TEXT NOT NULL,
  depth_order INT  NOT NULL CHECK (depth_order BETWEEN 1 AND 3),
  roster_id   UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  PRIMARY KEY (position, depth_order),
  UNIQUE (roster_id)
);
