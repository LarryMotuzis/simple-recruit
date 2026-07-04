-- 014_users_fk_set_null.sql
-- Allow user deletion by nullifying created_by/author_id/actor_id references.

ALTER TABLE prospects
  DROP CONSTRAINT prospects_created_by_fkey,
  ADD CONSTRAINT prospects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE evaluations
  DROP CONSTRAINT evaluations_author_id_fkey,
  ADD CONSTRAINT evaluations_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_log
  DROP CONSTRAINT audit_log_actor_id_fkey,
  ADD CONSTRAINT audit_log_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE roster
  DROP CONSTRAINT roster_created_by_fkey,
  ADD CONSTRAINT roster_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
