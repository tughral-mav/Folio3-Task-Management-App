-- Story 7.1 follow-up: EXPLICIT table privileges for the authenticated role.
--
-- Cloud Supabase applies default privileges that grant `authenticated` on new
-- public tables, but that is environment-dependent (the local CLI stack does
-- not), so relying on it is fragile. Granting explicitly makes the schema
-- self-contained and identical everywhere. These grants are NECESSARY BUT NOT
-- SUFFICIENT — every row is still gated by the RLS policies in
-- 20260811100400_rls.sql. anon remains fully revoked.
--
-- Privilege set mirrors the RLS matrix (architecture §5):
--   users         SELECT           (directory read; no client writes)
--   tasks         SELECT/INSERT/UPDATE (admin-gated by RLS; no DELETE ever)
--   task_updates  SELECT           (inserts go through the definer RPC)
--   notifications SELECT/UPDATE     (own rows; read-state guarded by trigger)
--   task_activity SELECT           (append-only; writes are trigger-only)

grant select on public.users to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select on public.task_updates to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.task_activity to authenticated;
