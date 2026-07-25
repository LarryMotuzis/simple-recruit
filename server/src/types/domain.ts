/**
 * Hand-written row types mirroring the Postgres schema (src/db/migrations/*.sql).
 * No ORM here, so these are kept in sync manually as migrations evolve.
 */

export interface StatEntryRow {
  id: string;
  prospect_id: string;
  game_date: string;
  points: number | null;
  assists: number | null;
  rebounds: number | null;
  fg_made: number | null;
  fg_attempted: number | null;
  minutes: number | null;
  created_at: string;
}

export interface EvaluationRow {
  id: string;
  prospect_id: string;
  author_id: string | null;
  eval_date: string;
  rating: number;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface PortalFeedRow {
  id: string;
  on3_key: number | null;
  full_name: string;
  position_abbr: string | null;
  height: string | null;
  class_rank: string | null;
  from_school: string | null;
  to_school: string | null;
  status: string;
  stars: number | null;
  portal_entered_at: string | null;
  on3_slug: string | null;
  level: string;
  source: string;
  csv_key: string | null;
  scraped_at: string;
  imported_prospect_id: string | null;
}
