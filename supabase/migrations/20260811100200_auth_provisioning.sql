-- Story 1.4 / architecture §4 (ADR-1): the Folio3 domain gate and automatic
-- provisioning, enforced INSIDE the auth transaction. A rejected identity
-- aborts auth.users creation entirely — no auth row, no session, no profile.

-- Exact, case-insensitive, full-domain match (EC-A3): the part after the
-- LAST '@' must equal the configured domain. Never endsWith/LIKE.
create or replace function private.email_domain_allowed(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_domain  text;
  v_allowed text;
begin
  if p_email is null or position('@' in p_email) = 0 then
    return false;
  end if;
  v_domain := lower(substring(p_email from '@([^@]*)$'));
  select lower(allowed_domain) into v_allowed from private.app_settings;
  return v_domain is not null and v_domain = v_allowed;
end;
$$;

-- AFTER INSERT (not BEFORE): public.users.id has an FK to auth.users(id), so
-- the auth row must exist first. RAISE here still aborts the whole auth
-- transaction, which is the rejection mechanism (ADR-1).
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email    text;
  v_verified boolean;
begin
  v_email := lower(coalesce(new.email, ''));

  -- EC-A2: provider-verified emails only. Google sets email_verified in
  -- metadata; email_confirmed_at is the GoTrue-level equivalent.
  v_verified := coalesce(
    (nullif(new.raw_user_meta_data ->> 'email_verified', ''))::boolean,
    new.email_confirmed_at is not null
  );

  if not v_verified or not private.email_domain_allowed(v_email) then
    raise exception 'FOLIO3_DOMAIN_REJECTED'
      using hint = 'Only verified Folio3 Google accounts may access this application.';
  end if;

  -- FR3/EC-A4: provision atomically; unique(id) makes duplicates impossible.
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    v_email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- EC-A5: keep name/avatar fresh on later logins; email changes must still
-- satisfy the domain gate. Never touches role.
create or replace function private.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if new.raw_user_meta_data is not distinct from old.raw_user_meta_data
     and new.email is not distinct from old.email then
    return new;
  end if;

  v_email := lower(coalesce(new.email, ''));
  if not private.email_domain_allowed(v_email) then
    raise exception 'FOLIO3_DOMAIN_REJECTED'
      using hint = 'Only verified Folio3 Google accounts may access this application.';
  end if;

  update public.users
  set email      = v_email,
      full_name  = coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        full_name
      ),
      avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', avatar_url)
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function private.sync_auth_user_profile();

-- SEC-6 belt-and-braces: even though public.users has NO write policies for
-- API roles, this guard makes identity/role tampering impossible through any
-- API-context write path that might be added by mistake later. Operator SQL
-- (dashboard/psql, no request JWT) and service_role remain able to change
-- roles — that is the Phase 1 admin-promotion procedure.
create or replace function private.protect_user_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_api_role text;
begin
  v_api_role := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  if v_api_role in ('anon', 'authenticated')
     and ( new.role  is distinct from old.role
        or new.id    is distinct from old.id
        or new.email is distinct from old.email ) then
    raise exception 'USER_IDENTITY_PROTECTED'
      using hint = 'Roles and identity fields cannot be changed through the API.';
  end if;
  return new;
end;
$$;

create trigger users_protect_identity
  before update on public.users
  for each row execute function private.protect_user_identity();
