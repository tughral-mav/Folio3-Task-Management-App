-- Deterministic seed for LOCAL/CI only (test strategy §5). Never applied to
-- production. Inserting into auth.users fires the domain-gate/provisioning
-- trigger — so the seed itself exercises ADR-1 (all emails must be @folio3.com).

insert into auth.users
  ( id, instance_id, aud, role, email, encrypted_password, email_confirmed_at
  , raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  , confirmation_token, recovery_token, email_change, email_change_token_new
  , email_change_token_current )
values
  ( '00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000'
  , 'authenticated', 'authenticated', 'seed.admin@folio3.com', '', now()
  , '{"provider":"google","providers":["google"]}'
  , '{"full_name":"Seed Admin","email_verified":true}', now(), now(), '', '', '', '', '' ),
  ( '00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000'
  , 'authenticated', 'authenticated', 'seed.member.a@folio3.com', '', now()
  , '{"provider":"google","providers":["google"]}'
  , '{"full_name":"Seed Member A","email_verified":true}', now(), now(), '', '', '', '', '' ),
  ( '00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000'
  , 'authenticated', 'authenticated', 'seed.member.b@folio3.com', '', now()
  , '{"provider":"google","providers":["google"]}'
  , '{"full_name":"Seed Member B","email_verified":true}', now(), now(), '', '', '', '', '' );

-- Phase 1 admin-promotion procedure (operator SQL — the documented path).
update public.users set role = 'ADMIN' where email = 'seed.admin@folio3.com';

-- Representative tasks (fan-out triggers create activity + notifications;
-- actor is NULL here = system, so assignees DO get seeded notifications).
insert into public.tasks (id, title, description, created_by, assigned_to, status, priority, due_date)
values
  ( '00000000-0000-4000-9000-000000000001'
  , 'Prepare Q3 report', 'Compile the quarterly delivery report.'
  , '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'
  , 'TODO', 'HIGH', now() + interval '3 days' ),
  ( '00000000-0000-4000-9000-000000000002'
  , 'Fix staging deploy', 'Staging pipeline fails on migration step.'
  , '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'
  , 'IN_PROGRESS', 'URGENT', now() - interval '1 day' ),  -- overdue (EC-T7)
  ( '00000000-0000-4000-9000-000000000003'
  , 'Update onboarding docs', 'Refresh the new-hire onboarding guide.'
  , '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'
  , 'BLOCKED', 'LOW', now() + interval '7 days' ),
  ( '00000000-0000-4000-9000-000000000004'
  , 'Review security checklist', 'Walk the SEC checklist for the release.'
  , '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'
  , 'COMPLETED', 'MEDIUM', now() - interval '2 days' );  -- completed-late: NOT overdue

-- One progress update (fires PROGRESS_SUBMITTED fan-out to the creator).
insert into public.task_updates (task_id, author_id, body, percent)
values
  ( '00000000-0000-4000-9000-000000000002'
  , '00000000-0000-4000-8000-000000000002'
  , 'Identified the failing migration; testing a fix on a branch.', 60 );
