-- Story 1.4 / architecture §5 (ADR-2): RLS on every table, with SECURITY
-- DEFINER helpers for role lookups (always-fresh, no recursive policies).
-- Cells with no policy DENY by design; writes without policies happen only
-- inside SECURITY DEFINER functions/triggers that carry their own validation.

-- ------------------------------------------------------------- helpers
create or replace function private.is_provisioned()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users where id = (select auth.uid())
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'ADMIN'
  );
$$;

revoke all on function private.is_provisioned() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_provisioned() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- ------------------------------------------------------------ enable RLS
alter table public.users         enable row level security;
alter table public.tasks         enable row level security;
alter table public.task_updates  enable row level security;
alter table public.notifications enable row level security;
alter table public.task_activity enable row level security;

-- Hygiene: anon gets nothing at the grant level either (SEC layers).
revoke all on public.users, public.tasks, public.task_updates,
           public.notifications, public.task_activity from anon;

-- --------------------------------------------------------------- users
-- ADR-7: provisioned users can read the directory (internal tool; needed to
-- render creator/assignee/actor names). No API write policies AT ALL:
-- provisioning + profile sync are definer triggers; role changes are
-- operator SQL (Phase 1 procedure) — Test 11 fails closed here.
create policy users_select on public.users
  for select to authenticated
  using (private.is_provisioned());

-- --------------------------------------------------------------- tasks
-- Member reads own assignments; admin reads all (FR14, A6).
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    assigned_to = (select auth.uid())
    or private.is_admin()
  );

-- Admin-only create; created_by is pinned to the caller (FR10, SEC-8).
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    private.is_admin()
    and created_by = (select auth.uid())
  );

-- Admin-only direct update (FR13). The member path is exclusively the
-- submit_progress_update RPC (ADR-3), which validates and bypasses this.
create policy tasks_update on public.tasks
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- No DELETE policy: tasks are never hard-deleted (A1/FR16).

-- -------------------------------------------------------- task_updates
-- Reads: admins all; members on their own assigned tasks (FR22). The nested
-- tasks lookup runs under the caller's own RLS — no recursion (tasks policies
-- never reference task_updates).
create policy task_updates_select on public.task_updates
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and t.assigned_to = (select auth.uid())
    )
  );

-- No INSERT policy: writes go through the RPC (definer). No UPDATE/DELETE:
-- immutable (A3/SEC-18).

-- ------------------------------------------------------- notifications
create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

-- Own rows only; the guard trigger below restricts the change to read_at.
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- No INSERT (trigger-only) / DELETE policies.

-- ------------------------------------------------------- task_activity
create policy task_activity_select on public.task_activity
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and t.assigned_to = (select auth.uid())
    )
  );

-- No INSERT (trigger-only) / UPDATE / DELETE policies: append-only (SEC-17).

-- ------------------------------- notifications guard: read_at-only updates
create or replace function private.protect_notification_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id           is distinct from old.id
     or new.recipient_id is distinct from old.recipient_id
     or new.type       is distinct from old.type
     or new.task_id    is distinct from old.task_id
     or new.title      is distinct from old.title
     or new.message    is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'NOTIFICATION_IMMUTABLE'
      using hint = 'Only the read state of a notification can change.';
  end if;
  return new;
end;
$$;

create trigger notifications_protect_columns
  before update on public.notifications
  for each row execute function private.protect_notification_columns();
