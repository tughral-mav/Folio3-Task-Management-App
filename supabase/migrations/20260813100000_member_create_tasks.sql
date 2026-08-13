-- Epic 9 / v0.4 (FR42/FR43): any provisioned user may CREATE a task and
-- assign it to anyone; a creator can see the tasks they created. This
-- deliberately supersedes the governing prompt's admin-only-create rule
-- (recorded in the PRD Change Log). Everything else stays admin-only:
-- edit/reassign/set-any-status via the tasks UPDATE policy, role changes
-- locked, and no cross-user visibility beyond tasks you are the assignee or
-- creator of. created_by is still pinned to the caller (no spoofing).

-- ---- tasks: INSERT now any provisioned user, creator pinned to self.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    private.is_provisioned()
    and created_by = (select auth.uid())
  );

-- ---- tasks: SELECT widened to include the creator.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
    or private.is_admin()
  );

-- ---- task_updates: SELECT — assignee OR creator of the task, or admin.
drop policy if exists task_updates_select on public.task_updates;
create policy task_updates_select on public.task_updates
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = (select auth.uid())
             or t.created_by = (select auth.uid()))
    )
  );

-- ---- task_activity: SELECT — assignee OR creator of the task, or admin.
drop policy if exists task_activity_select on public.task_activity;
create policy task_activity_select on public.task_activity
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = (select auth.uid())
             or t.created_by = (select auth.uid()))
    )
  );

-- Note: tasks UPDATE stays admin-only (unchanged); the member progress path
-- remains the submit_progress_update RPC (assignee-only). No DELETE anywhere.
