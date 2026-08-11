-- CI schema verification (Story 1.4 AC / NFR10): asserts the migrated +
-- seeded database matches the architecture. Any failed assertion raises.

do $$
declare
  v_count int;
  t text;
begin
  -- 1) all five tables exist with RLS enabled
  for t in select unnest(array['users','tasks','task_updates','notifications','task_activity']) loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then
      raise exception 'Table public.% missing or RLS not enabled', t;
    end if;
  end loop;

  -- 2) domain gate provisioned exactly the seeded Folio3 users
  select count(*) into v_count from public.users;
  if v_count <> 3 then
    raise exception 'Expected 3 provisioned users, found %', v_count;
  end if;

  -- 3) roles: default TEAM_MEMBER + operator-promoted admin
  select count(*) into v_count from public.users where role = 'ADMIN';
  if v_count <> 1 then
    raise exception 'Expected exactly 1 ADMIN, found %', v_count;
  end if;

  -- 4) fan-out created activity for every seeded task write
  select count(*) into v_count from public.task_activity where type = 'TASK_CREATED';
  if v_count <> 4 then
    raise exception 'Expected 4 TASK_CREATED activity rows, found %', v_count;
  end if;

  select count(*) into v_count from public.task_activity where type = 'PROGRESS_SUBMITTED';
  if v_count <> 1 then
    raise exception 'Expected 1 PROGRESS_SUBMITTED activity row, found %', v_count;
  end if;

  -- 5) notifications: 4 assignment (actor NULL = system) + 1 progress→creator
  select count(*) into v_count from public.notifications where type = 'TASK_ASSIGNED';
  if v_count <> 4 then
    raise exception 'Expected 4 TASK_ASSIGNED notifications, found %', v_count;
  end if;

  select count(*) into v_count
  from public.notifications
  where type = 'PROGRESS_SUBMITTED'
    and recipient_id = '00000000-0000-4000-8000-000000000001';
  if v_count <> 1 then
    raise exception 'Expected 1 PROGRESS_SUBMITTED notification for the creator, found %', v_count;
  end if;

  -- 6) completed_at maintenance (EC-T4): set on the COMPLETED seed task
  select count(*) into v_count
  from public.tasks
  where status = 'COMPLETED' and completed_at is not null;
  if v_count <> 1 then
    raise exception 'completed_at not maintained for COMPLETED task';
  end if;

  -- 7) required functions exist
  for t in select unnest(array['is_admin','is_provisioned','handle_new_auth_user','notify_user']) loop
    if not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.proname = t
    ) then
      raise exception 'Function private.% missing', t;
    end if;
  end loop;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_progress_update'
  ) then
    raise exception 'Function public.submit_progress_update missing';
  end if;

  -- 8) non-Folio3 auth user must be REJECTED by the gate (EC-A1)
  begin
    insert into auth.users
      ( id, instance_id, aud, role, email, encrypted_password, email_confirmed_at
      , raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      , confirmation_token, recovery_token, email_change, email_change_token_new
      , email_change_token_current )
    values
      ( '00000000-0000-4000-8000-00000000dead', '00000000-0000-0000-0000-000000000000'
      , 'authenticated', 'authenticated', 'intruder@gmail.com', '', now()
      , '{"provider":"google","providers":["google"]}'
      , '{"full_name":"Intruder","email_verified":true}', now(), now(), '', '', '', '', '' );
    raise exception 'DOMAIN GATE FAILED: non-Folio3 auth user was accepted';
  exception
    when others then
      if sqlerrm like '%FOLIO3_DOMAIN_REJECTED%' then
        null; -- correct rejection
      else
        raise;
      end if;
  end;

  raise notice 'Schema verification passed.';
end $$;
