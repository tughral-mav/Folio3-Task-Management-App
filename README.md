# Folio3 Task Management App

An **internal** task management web application for Folio3 employees. Administrators create and assign tasks; team members work them and report progress; persisted in-app notifications keep everyone current. Access is exclusively via Folio3 Google accounts (`@folio3.com`) — **no signup, no passwords**.

**Production:** https://folio3-task-management-app.vercel.app

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Authentication & User Creation Flow](#authentication--user-creation-flow)
- [Role Management](#role-management)
- [Local Setup](#local-setup)
- [Supabase Setup](#supabase-setup)
- [Google OAuth Setup](#google-oauth-setup)
- [Environment Variables](#environment-variables)
- [Database & Migrations](#database--migrations)
- [Row Level Security](#row-level-security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Self-Hosting on a VM (Azure/AWS)](#self-hosting-on-a-vm-azureaws)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Project Structure & Process](#project-structure--process)

## Features

- **Google-only authentication**, restricted to verified `@folio3.com` accounts. First sign-in auto-creates the user as `TEAM_MEMBER`. No registration form, no password login.
- **Admin**: create/assign/edit tasks, set priority/deadline/status, reassign, global searchable & filterable task list, team roster, dashboard with live stats (total / to-do / in-progress / blocked / completed / overdue).
- **Team member**: see only their assigned tasks, submit immutable progress updates (text + optional % + optional status move), personal dashboard with a "needs attention" section, activity history.
- **Persisted notifications** with a live unread badge (Supabase Realtime) and a notification center (open → navigate + mark read, mark all read).
- **Security in depth**: server-side authorization *and* Row Level Security on every table; the frontend is never the security boundary.
- Responsive (desktop → mobile), accessible (semantic HTML, keyboard nav, focus states, status never by color alone), with loading/error/empty states throughout.

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components + Server Actions) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS 4 |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + Google OAuth (External consent screen) |
| Realtime | Supabase Realtime |
| Validation | Zod (server-authoritative) |
| Tests | Vitest (unit + RLS via `pg`), Playwright (E2E) |
| Hosting | Vercel (portable to a self-hosted VM via Dockerfile) |

Full rationale: [docs/architecture/architecture.md](docs/architecture/architecture.md) (ADR-1…10).

## Architecture

A single Next.js app serves UI and backend. Reads use Server Components through a user-scoped Supabase client (RLS applies); writes use Server Actions that validate (Zod) → check role/ownership server-side → write through the same client (RLS re-enforces) → revalidate. Activity events and notifications are produced by **database triggers** in the same transaction as each write, so they are atomic on every path. Members can only change task state through one `SECURITY DEFINER` RPC (`submit_progress_update`). There is **no service-role client in the app** — provisioning happens entirely inside the database.

See [docs/architecture/architecture.md](docs/architecture/architecture.md) for the schema, the RLS policy matrix, and the fan-out design.

## Authentication & User Creation Flow

```
Open app → Continue with Google → Google OAuth (Supabase Auth)
  → DB trigger on auth.users INSERT verifies: email_verified AND
    email domain == folio3.com (exact, case-insensitive)
      ├─ reject → auth transaction aborts (no auth user, no session) → Access Denied
      └─ accept → public.users row created (role TEAM_MEMBER) in the same transaction
  → app reads role from DB → Admin Dashboard or Team Member Dashboard
```

- **There is no signup flow.** Only `@folio3.com` Google accounts are permitted.
- **First-time users are automatically inserted** into `public.users`.
- **New users default to `TEAM_MEMBER`.** Users can never choose or change their own role.
- Repeat logins never create duplicate rows (the user id is the Supabase auth id; email is unique).

## Role Management

Two roles: `TEAM_MEMBER` (default) and `ADMIN`. **In Phase 1 there is intentionally no role-management UI** — admins are assigned directly in the database by an authorized operator:

```sql
update public.users set role = 'ADMIN' where email = 'admin@folio3.com';
```

Run it from the Supabase dashboard SQL editor or `psql`. The change takes effect on the user's next request (the role is read from the DB every request). No client path — server action, API, or crafted request — can modify `users.role`.

## Local Setup

Prerequisites: Node.js 20.9+ (24 recommended), npm, and Docker (only for local Supabase / running the RLS suite).

```bash
git clone https://github.com/tughral-mav/Folio3-Task-Management-App.git
cd Folio3-Task-Management-App
npm install
cp .env.example .env.local        # fill in the values (see below)
npm run dev                        # http://localhost:3000
```

Quality commands: `npm run lint`, `npm run typecheck`, `npm test` (unit), `npm run test:rls` (needs local Supabase), `npm run test:e2e`.

## Supabase Setup

The cloud project is provisioned. To reproduce from scratch:

```bash
# 1. Create a project (or via dashboard)
npx supabase projects create folio3-task-management-app --org-id <org> --region <region> --db-password <pw>

# 2. Link this repo to it
npx supabase link --project-ref <ref> -p <pw>

# 3. Apply all migrations
npx supabase db push -p <pw>

# 4. (Re)generate typed client after schema changes
npx supabase gen types typescript --linked > src/lib/types/database.ts
```

The seed (`supabase/seed.sql`) is applied only to the **local** stack (`supabase start` / `supabase db reset`) — never to production.

## Google OAuth Setup

External consent screen (no Google Workspace org admin required):

1. **Google Cloud Console → Google Auth Platform**: create a project; consent screen **External**, publishing status **Testing**.
2. **Audience → Test users**: add each `@folio3.com` account that will sign in during testing (Testing mode admits only listed users), plus any account used to verify the rejection path.
3. **Clients → Create client → Web application**. Authorized redirect URI (exact, no trailing slash):
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client secret**.
5. **Supabase → Auth → Providers → Google**: enable, paste the client ID/secret. Disable email/phone/anonymous providers. Set the Site URL and redirect allow-list to your app's origin(s) (`http://localhost:3000` for dev, the production URL for prod), each with `/auth/callback`.

The Google client's redirect URI targets the Supabase domain, so it does not change when the app's host changes; only Supabase's Site URL / allow-list does.

## Environment Variables

Copy `.env.example` → `.env.local`. Never commit real secrets.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key (safe; RLS is the boundary) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Present for completeness; **not used by any Phase 1 feature**. Never expose to the client. |
| `FOLIO3_GOOGLE_DOMAIN` | server | `folio3.com` — mirrors the DB-authoritative allowed domain |
| `NEXT_PUBLIC_SITE_URL` | client + server | Canonical origin for redirects/links |

## Database & Migrations

All schema lives in `supabase/migrations/` and is reproducible on a fresh project (`supabase db reset` locally, `supabase db push` to cloud):

| Migration | Contents |
|---|---|
| `…100000_init` | extensions, `private` schema, enums, `app_settings` (allowed domain) |
| `…100100_tables` | `users`, `tasks`, `task_updates`, `notifications`, `task_activity` + constraints, indexes, `updated_at`/`completed_at` triggers |
| `…100200_auth_provisioning` | domain-gate + auto-provisioning trigger, profile sync, identity/role guard |
| `…100300_fanout` | activity + notification triggers (recipients `{assignee, creator} − {actor}`) |
| `…100400_rls` | RLS enabled + full policy set + role-lookup helper functions |
| `…100500_rpcs` | `submit_progress_update`, `mark_all_notifications_read` |
| `…100600_realtime` | realtime publication for `notifications` and `tasks` |

## Row Level Security

RLS is enabled on all five tables and is mandatory. Summary (full matrix in the architecture doc):

- **users** — provisioned users can read the directory; no client write path (provisioning and role changes bypass the API by design).
- **tasks** — members read only tasks assigned to them; admins read all; only admins insert/update; no deletes.
- **task_updates** — members read updates on their own tasks; inserts happen only through the RPC; no update/delete (immutable).
- **notifications** — recipients read/mark-read only their own rows (read state only); inserts are trigger-only.
- **task_activity** — members read activity for their own tasks; admins read all; append-only.

Role checks inside policies use `SECURITY DEFINER` helper functions (`private.is_admin`, `private.is_provisioned`) to stay always-fresh and avoid recursive policies.

## Testing

| Command | Layer | Notes |
|---|---|---|
| `npm test` | Unit (Vitest) | Pure logic (domain gate, overdue, validation). Docker-free. |
| `npm run test:rls` | RLS/authorization | Impersonates anon/member/admin against local Supabase; covers IDOR, privilege escalation, admin-only actions, immutability. Needs Docker. |
| `npm run test:e2e` | E2E (Playwright) | Desktop + mobile viewports; session-injection for auth. |

CI (GitHub Actions) runs lint, typecheck, unit tests, and a production build; a second job spins up a real Supabase stack, applies migrations + seed, runs schema verification, and executes the RLS suite. The real Google OAuth handshake is verified manually (Google blocks scripted logins) — see [docs/testing/](docs/testing/).

## Deployment

Vercel, auto-deploying from the **`develop`** branch (this project keeps all work on `develop`; `main` is frozen). Env vars are set in the Vercel project. On any new production host, update the Google redirect (only if the Supabase project changes) and the Supabase Auth Site URL / allow-list. Full checklist: [docs/deployment/deployment-requirements.md](docs/deployment/deployment-requirements.md).

## Self-Hosting on a VM (Azure/AWS)

The app is host-portable — no Vercel-proprietary services. To run on a VM:

```bash
# Build a container (uses Next.js standalone output; VERCEL is unset here)
docker build -t folio3-task-app \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg NEXT_PUBLIC_SITE_URL=https://tasks.folio3.com .
docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=... -e FOLIO3_GOOGLE_DOMAIN=folio3.com \
  folio3-task-app
```

Put nginx/Caddy in front for TLS. Then update the Supabase Auth **Site URL** and **redirect allow-list** to the VM's domain (the Google OAuth client is unchanged — it points at Supabase). Supabase (DB/Auth/Realtime) remains the managed backend.

## Security Considerations

- Google OAuth only; exact `@folio3.com` domain gate enforced in the database (verified email + full-domain match), with an app-layer backstop and RLS behind it.
- Authorization enforced server-side **and** by RLS; hiding UI is usability only.
- No client path can change `users.role`; no DELETE paths; progress updates and activity are immutable at the database layer.
- Service-role key is server-only and unused by Phase 1 features; no secrets in source (`.env.example` holds placeholders).
- Inputs validated server-side (Zod) and constrained in the DB; user text rendered as escaped plain text; friendly errors only (no stack traces to users).
- Tested explicitly for IDOR and privilege escalation (`npm run test:rls`).

## Troubleshooting

- **"Access denied" for a `@folio3.com` account** — in Testing mode the account must be added as a Google **test user**; also confirm the email is verified on the Google side.
- **Login bounces back to /login** — check the Supabase Auth Site URL / redirect allow-list includes your origin + `/auth/callback`, and that `NEXT_PUBLIC_SITE_URL` matches.
- **A colleague isn't in the assignee list** — assignees are provisioned users; they must sign in once first.
- **Vercel build fails on `.nft.json`** — `output: 'standalone'` conflicts with Vercel packaging; it is auto-disabled when `VERCEL` is set (see `next.config.ts`).
- **`npm run test:rls` can't connect** — it needs a local Supabase stack (`npx supabase start`) and Docker.

## Project Structure & Process

Built with the BMAD method through an agent pipeline (Planning → Architecture → Development → Testing → Code Review → Deployment) with quality gates. The PRD ([docs/requirements/prd.md](docs/requirements/prd.md)) is the source of truth; stories are sharded in [docs/stories/](docs/stories/).

```
docs/{requirements,architecture,testing,deployment,code-review,stories}
supabase/migrations   # reproducible schema
src/app               # routes (App Router): (public) login/access-denied, (app) admin/my/notifications
src/components        # UI (tasks, notifications)
src/lib               # env, auth, supabase clients, validation, types, utils
src/server            # actions (mutations) + queries (reads)
tests/{unit,rls,e2e}
```

## License

Internal Folio3 project.
