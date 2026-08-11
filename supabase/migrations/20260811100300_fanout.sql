-- Story 1.4 / architecture §6 (ADR-4, ADR-8): activity + notification fan-out
-- via AFTER triggers — atomic with the data write on every path.
--
-- Recipient rule (ADR-8): task-level events notify {assignee, creator} − {actor};
-- assignment events target the new (+courtesy old) assignee; a recipient gets
-- at most ONE notification per statement (EC-N6).
--
-- The submit_progress_update RPC sets the transaction-local GUC
-- app.suppress_task_notification = '1' so a member's status change produces a
-- single consolidated PROGRESS_SUBMITTED notification instead of two.

-- Central creation point — future per-admin preferences (FR33/D2) slot in here.
create or replace function private.notify_user(
  p_recipient uuid,
  p_actor     uuid,
  p_type      public.notification_type,
  p_task_id   uuid,
  p_title     text,
  p_message   text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null or p_recipient = p_actor then
    return false; -- EC-N1: self-actions never notify
  end if;
  insert into public.notifications (recipient_id, type, task_id, title, message)
  values (p_recipient, p_type, p_task_id, p_title, left(coalesce(p_message, ''), 500));
  return true;
end;
$$;

-- ------------------------------------------------------- tasks: INSERT
create or replace function private.on_task_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid(); -- NULL for seed/operator inserts
begin
  insert into public.task_activity (task_id, actor_id, type, detail)
  values (new.id, v_actor, 'TASK_CREATED',
          jsonb_build_object('assigned_to', new.assigned_to,
                             'priority', new.priority,
                             'due_date', new.due_date));

  perform private.notify_user(
    new.assigned_to, v_actor, 'TASK_ASSIGNED', new.id,
    'New task assigned to you', new.title);

  return new;
end;
$$;

create trigger tasks_after_insert
  after insert on public.tasks
  for each row execute function private.on_task_created();

-- ------------------------------------------------------- tasks: UPDATE
create or replace function private.on_task_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor          uuid := auth.uid();
  v_suppress       boolean :=
    coalesce(current_setting('app.suppress_task_notification', true), '') = '1';
  v_notified       uuid[] := array[]::uuid[];
  v_reassigned     boolean := new.assigned_to is distinct from old.assigned_to;
  v_status_changed boolean := new.status is distinct from old.status;
  v_changed        text[] := array[]::text[];
  v_ntype          public.notification_type;
  v_atype          public.activity_type;
  v_recipient      uuid;
begin
  -- field-edit diff (title/description/priority/due_date)
  if new.title       is distinct from old.title       then v_changed := v_changed || 'title';       end if;
  if new.description is distinct from old.description then v_changed := v_changed || 'description'; end if;
  if new.priority    is distinct from old.priority    then v_changed := v_changed || 'priority';    end if;
  if new.due_date    is distinct from old.due_date    then v_changed := v_changed || 'due_date';    end if;

  -- ---- activity (always recorded, FR23)
  if v_reassigned then
    insert into public.task_activity (task_id, actor_id, type, detail)
    values (new.id, v_actor, 'TASK_REASSIGNED',
            jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
  end if;

  if v_status_changed then
    v_atype := case new.status
                 when 'COMPLETED' then 'TASK_COMPLETED'::public.activity_type
                 when 'CANCELLED' then 'TASK_CANCELLED'::public.activity_type
                 else 'STATUS_CHANGED'::public.activity_type
               end;
    insert into public.task_activity (task_id, actor_id, type, detail)
    values (new.id, v_actor, v_atype,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if array_length(v_changed, 1) is not null then
    insert into public.task_activity (task_id, actor_id, type, detail)
    values (new.id, v_actor, 'TASK_UPDATED', jsonb_build_object('changed', v_changed));
  end if;

  -- ---- notifications (consolidated per recipient, EC-N6)
  if v_suppress then
    return new; -- RPC path: task_updates trigger sends the one notification
  end if;

  if v_reassigned then
    if private.notify_user(new.assigned_to, v_actor, 'TASK_ASSIGNED', new.id,
                           'Task assigned to you', new.title) then
      v_notified := v_notified || new.assigned_to;
    end if;
    if private.notify_user(old.assigned_to, v_actor, 'TASK_REASSIGNED', new.id,
                           'Task reassigned', 'No longer assigned to you: ' || new.title) then
      v_notified := v_notified || old.assigned_to;
    end if;
  end if;

  if v_status_changed then
    v_ntype := case new.status
                 when 'COMPLETED' then 'TASK_COMPLETED'::public.notification_type
                 when 'BLOCKED'   then 'TASK_BLOCKED'::public.notification_type
                 else 'STATUS_CHANGED'::public.notification_type
               end;
    foreach v_recipient in array array[new.assigned_to, new.created_by] loop
      if not (v_recipient = any (v_notified)) then
        if private.notify_user(v_recipient, v_actor, v_ntype, new.id,
                               'Task status: ' || new.status, new.title) then
          v_notified := v_notified || v_recipient;
        end if;
      end if;
    end loop;
  elsif array_length(v_changed, 1) is not null then
    foreach v_recipient in array array[new.assigned_to, new.created_by] loop
      if not (v_recipient = any (v_notified)) then
        if private.notify_user(v_recipient, v_actor, 'TASK_UPDATED', new.id,
                               'Task updated', new.title) then
          v_notified := v_notified || v_recipient;
        end if;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create trigger tasks_after_update
  after update on public.tasks
  for each row execute function private.on_task_updated();

-- ----------------------------------------------- task_updates: INSERT
create or replace function private.on_progress_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task    public.tasks%rowtype;
  v_message text;
begin
  select * into v_task from public.tasks where id = new.task_id;

  insert into public.task_activity (task_id, actor_id, type, detail)
  values (new.task_id, new.author_id, 'PROGRESS_SUBMITTED',
          jsonb_build_object('percent', new.percent, 'new_status', new.new_status));

  v_message := left(new.body, 200);
  if new.new_status is not null then
    v_message := '[' || new.new_status || '] ' || v_message;
  end if;
  if new.percent is not null then
    v_message := '(' || new.percent || '%) ' || v_message;
  end if;

  -- D2: the task creator is the Phase 1 recipient.
  perform private.notify_user(
    v_task.created_by, new.author_id, 'PROGRESS_SUBMITTED', new.task_id,
    'Progress on: ' || v_task.title, v_message);

  return new;
end;
$$;

create trigger task_updates_after_insert
  after insert on public.task_updates
  for each row execute function private.on_progress_submitted();
