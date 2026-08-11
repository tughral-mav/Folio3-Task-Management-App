-- Story 1.4 / architecture §7: Realtime for notification badges and member
-- task views (FR29/FR32). Subscriptions are authenticated and RLS-filtered.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.tasks;
