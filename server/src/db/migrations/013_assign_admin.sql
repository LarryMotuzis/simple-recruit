-- 013_assign_admin.sql
-- Promote Larry to admin (must run after 012 commits the new enum value).

UPDATE users SET role = 'admin' WHERE email = 'larrymotuzis@gmail.com';
