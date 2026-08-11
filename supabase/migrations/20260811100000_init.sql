-- Story 1.4 / architecture §3: extensions, private schema, enums, settings.

create extension if not exists pgcrypto;

-- Internal schema: helpers, triggers, settings. Never exposed via PostgREST.
create schema if not exists private;

-- ADR-5: Postgres enums; extend later via ALTER TYPE ... ADD VALUE.
create type public.user_role as enum ('TEAM_MEMBER', 'ADMIN');

create type public.task_status as enum
  ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

create type public.task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

create type public.activity_type as enum
  ( 'TASK_CREATED', 'TASK_REASSIGNED', 'TASK_UPDATED', 'STATUS_CHANGED'
  , 'PROGRESS_SUBMITTED', 'TASK_COMPLETED', 'TASK_CANCELLED');

create type public.notification_type as enum
  ( 'TASK_ASSIGNED', 'TASK_REASSIGNED', 'TASK_UPDATED', 'STATUS_CHANGED'
  , 'PROGRESS_SUBMITTED', 'TASK_COMPLETED', 'TASK_BLOCKED');

-- §4.2: the DB-authoritative allowed domain (app env FOLIO3_GOOGLE_DOMAIN
-- mirrors it; parity is asserted by a test). Single-row table.
create table private.app_settings (
  id             boolean primary key default true check (id),
  allowed_domain text not null
);

insert into private.app_settings (allowed_domain) values ('folio3.com');
