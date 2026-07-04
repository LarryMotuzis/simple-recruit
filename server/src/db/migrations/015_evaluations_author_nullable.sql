-- 015_evaluations_author_nullable.sql
-- Allow author_id to be NULL so evaluations survive when their author is deleted.

ALTER TABLE evaluations ALTER COLUMN author_id DROP NOT NULL;
