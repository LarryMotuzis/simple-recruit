-- 012_admin_role.sql
-- Add admin to the user_role enum. The UPDATE that uses it must be in a separate transaction (013).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
