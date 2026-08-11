-- Story 1.4 / architecture §3: the five application tables, constraints,
-- indexes, and row-maintenance triggers (updated_at, completed_at).

-- ---------------------------------------------------------------- users
-- ADR-6: users.id IS the Supabase auth user id — no dual-ID mapping.
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique check (email = lower(email)),
  full_name  text not null default '',
  avatar_url text,
  role       public.user_role not null default 'TEAM_MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- tasks
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  description  text not null default '' check (char_length(description) <= 10000),
  created_by   uuid not null references public.users (id),
  assigned_to  uuid not null references public.users (id),
  status       public.task_status not null default 'TODO',
  priority     public.task_priority not null default 'MEDIUM',
  due_date     timestamptz not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index tasks_assigned_to_status_idx on public.tasks (assigned_to, status);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_status_idx on public.tasks (status);
create index tasks_priority_idx on public.tasks (priority);
create index tasks_due_date_idx on public.tasks (due_date);
create index tasks_updated_at_idx on public.tasks (updated_at desc);

-- --------------------------------------------------------- task_updates
-- Immutable progress reports (PRD A3): no UPDATE/DELETE path exists anywhere.
create table public.task_updates (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id),
  author_id  uuid not null references public.users (id),
  body       text not null check (char_length(body) between 1 and 5000),
  percent    smallint check (percent between 0 and 100),
  new_status public.task_status,
  created_at timestamptz not null default now()
);

create index task_updates_task_id_idx on public.task_updates (task_id, created_at desc);

-- -------------------------------------------------------- notifications
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id),
  type         public.notification_type not null,
  task_id      uuid references public.tasks (id),
  title        text not null,
  message      text not null default '',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
-- Badge count (FR29) is a cheap partial-index scan.
create index notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

-- -------------------------------------------------------- task_activity
-- Append-only audit (FR24/SEC-17). actor_id NULL = system/operator.
create table public.task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id),
  actor_id   uuid references public.users (id),
  type       public.activity_type not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_activity_task_id_idx on public.task_activity (task_id, created_at desc);

-- ------------------------------------------------- maintenance triggers
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function private.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

-- EC-T4: completed_at reflects reality no matter which path set the status.
create or replace function private.maintain_task_completed_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'COMPLETED'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.completed_at := now();
  elsif new.status <> 'COMPLETED' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_maintain_completed_at
  before insert or update on public.tasks
  for each row execute function private.maintain_task_completed_at();
