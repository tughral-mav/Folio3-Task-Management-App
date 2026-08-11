-- Story 1.4 / architecture §6 (ADR-3): the ONLY member write-path to tasks,
-- plus race-safe mark-all-read.

-- Validates at execution time (EC-P3/P4: FOR UPDATE lock, assignment checked
-- now, not at render), enforces the D3/EC-T5 transition subset, rejects
-- closed tasks (EC-T6), and suppresses the duplicate task-status notification
-- so one member action yields one consolidated notification (EC-N6).
create or replace function public.submit_progress_update(
  p_task_id    uuid,
  p_body       text,
  p_percent    int default null,
  p_new_status public.task_status default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_task      public.tasks%rowtype;
  v_update_id uuid;
begin
  if v_uid is null or not private.is_provisioned() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id
  for update;

  -- Same error for "not found" and "not yours": no existence leak (EC-R3).
  if not found or v_task.assigned_to <> v_uid then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if v_task.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'TASK_CLOSED'
      using hint = 'Progress cannot be reported on a completed or cancelled task.';
  end if;

  if p_body is null or char_length(trim(p_body)) < 1 or char_length(p_body) > 5000 then
    raise exception 'INVALID_BODY'
      using hint = 'A progress update needs between 1 and 5000 characters.';
  end if;

  if p_percent is not null and (p_percent < 0 or p_percent > 100) then
    raise exception 'INVALID_PERCENT'
      using hint = 'Percent must be between 0 and 100.';
  end if;

  if p_new_status is not null
     and p_new_status not in ('IN_PROGRESS', 'BLOCKED', 'COMPLETED') then
    raise exception 'INVALID_STATUS_TARGET'
      using hint = 'Members may set IN_PROGRESS, BLOCKED, or COMPLETED.';
  end if;

  -- One consolidated notification for this action (see fan-out triggers).
  perform set_config('app.suppress_task_notification', '1', true);

  if p_new_status is not null and p_new_status is distinct from v_task.status then
    update public.tasks set status = p_new_status where id = p_task_id;
  end if;

  insert into public.task_updates (task_id, author_id, body, percent, new_status)
  values (p_task_id, v_uid, p_body, p_percent::smallint, p_new_status)
  returning id into v_update_id;

  return v_update_id;
end;
$$;

revoke all on function public.submit_progress_update(uuid, text, int, public.task_status) from public;
revoke all on function public.submit_progress_update(uuid, text, int, public.task_status) from anon;
grant execute on function public.submit_progress_update(uuid, text, int, public.task_status) to authenticated;

-- EC-N3: race-safe — notifications arriving mid-call stay unread. SECURITY
-- INVOKER on purpose: runs under the caller's RLS (own rows only).
create or replace function public.mark_all_notifications_read()
returns int
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.notifications
    set read_at = now()
    where recipient_id = (select auth.uid()) and read_at is null
    returning 1
  )
  select count(*)::int from updated;
$$;

revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.mark_all_notifications_read() from anon;
grant execute on function public.mark_all_notifications_read() to authenticated;
