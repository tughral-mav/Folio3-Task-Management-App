# Architecture — Folio3 Task Management App

> **BMAD artifact:** Architect output (pipeline Phase 2).
> **Status:** v1.0 — complete; governs Epic 1+ implementation.
> **Inputs:** [PRD v0.2](../requirements/prd.md) (decisions D1–D8, assumptions A1–A8) · [Security requirements](../requirements/security-requirements.md) (SEC-1…19) · [Edge cases](../requirements/edge-cases.md) · [Governing prompt §33](../requirements/initial-prompt.md)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-11 | 1.0 | Initial complete architecture | Claude (Architect Agent) |

## 1. Overview

A single Next.js (App Router) application serves both UI and backend (Server Components for reads, Server Actions + Route Handlers for writes) against Supabase (PostgreSQL + Auth + Realtime). No separate backend, no microservices. Security is enforced independently at the server layer (per-request role/ownership checks) and the database layer (RLS + triggers + constraints); the database is the final authority.

```
Browser (React, Tailwind)
   │ HTTPS
Next.js app ──────────────┐
   ├─ Server Components   │  reads (user-scoped Supabase server client → RLS)
   ├─ Server Actions      │  writes (validated, authorized, then RLS re-enforces)
   ├─ /auth/callback      │  OAuth code exchange
   └─ middleware          │  session refresh + coarse route protection
                          ▼
Supabase: Auth (Google OAuth only) · PostgreSQL (RLS, triggers, RPCs) · Realtime
```

## 2. Architecture Decision Records

| # | Decision | Choice | Rationale / alternatives rejected |
|---|---|---|---|
| ADR-1 | Domain-gate enforcement point (SEC-3) | **Database trigger on `auth.users` INSERT** (SECURITY DEFINER, raises on non-Folio3/unverified → auth user creation aborts) + callback UX check + RLS provisioning backstop | Plan-independent and unbypassable — GoTrue's insert transaction rolls back, so a rejected identity holds *nothing*. The optional "Before User Created" auth hook is a plan-dependent extra layer, not the foundation. App-layer-only checks (rejected) would leave orphan auth users and trust the app tier. |
| ADR-2 | Role lookup in RLS (SEC-9) | **SECURITY DEFINER helper functions** (`private.is_admin()`, `private.is_provisioned()`), STABLE, keyed on `auth.uid()` | Always-fresh (EC-R2: demotion bites on the *next request*; JWT custom claims lag until token refresh), free-tier safe, no recursive policies (helpers bypass RLS internally). Perf fine at internal scale; STABLE + `(select auth.uid())` initplan pattern. |
| ADR-3 | Member status transitions (D3, EC-T5) | **SECURITY DEFINER RPC `submit_progress_update()`** — the only member write-path to tasks; `tasks` UPDATE policy stays admin-only | One atomic validated transaction (assignee check at execution time → EC-P4; allowed targets IN_PROGRESS/BLOCKED/COMPLETED; rejects COMPLETED/CANCELLED tasks → EC-T6). A guarded member UPDATE policy (rejected) would need fragile column/transition triggers on the general path. |
| ADR-4 | Activity + notification fan-out | **AFTER-triggers on `tasks` and `task_updates`** create activity rows and notifications in the same transaction as the data write | Atomic by construction for *every* write path (admin server action, RPC). One UPDATE statement ⇒ one consolidated notification (EC-N6). App-layer orchestration (rejected) can partially fail; per-field notifications (rejected) spam. |
| ADR-5 | Enums vs lookup tables | **Postgres enums** (`user_role`, `task_status`, `task_priority`, + notification/activity types) | Type-safe, simple, extensible via `ALTER TYPE … ADD VALUE` migration — meets "extend later" without join overhead. |
| ADR-6 | `users.id` identity | **`users.id` = `auth.users.id`** (PK + FK, ON DELETE CASCADE); `email` unique (stored lowercase) | Kills the dual-ID mapping class of bugs; unique constraints make duplicate users impossible (EC-A4 races resolve at the DB). |
| ADR-7 | Directory visibility | **All provisioned users may SELECT all `users` rows** (columns: id, email, full_name, avatar_url, role, timestamps) | Internal company tool — colleague names/emails are not secret within Folio3; task detail/activity must render creator & actor names (relation-scoped policies grow brittle: EC/activity actors). "View team members" (admin) is a UI capability, not data secrecy. No sensitive columns exist on the table. |
| ADR-8 | Notification recipient rule | Task-level events notify **{assignee, creator} minus {actor}**; assignment events notify new (+courtesy to old) assignee; progress submissions notify creator | One uniform rule implements FR27/FR28 + EC-N1/EC-T3 (self-actions never notify) and covers "another admin edited" as an important task change (§17). D2-ready: recipients resolved in one place (trigger helper) for future preferences. |
| ADR-9 | Data fetching & state | **Server Components for reads; Server Actions for mutations; thin browser client only for Realtime subscriptions**; React context for session/profile; no global state library | Minimal client JS, no duplicated data layer. Realtime events trigger `router.refresh()`/targeted refetch. TanStack Query/Redux rejected as unneeded complexity at this scale. |
| ADR-10 | Validation & error shape | **Zod schemas shared client/server**; every action returns `{ ok: true, data } \| { ok: false, error: { code, message } }` | Server-side validation is authoritative (SEC-14); friendly `message` for UI, `code` + details to server logs only (SEC-16). |

## 3. Database Schema

All DDL lives in `supabase/migrations/` (Story 1.4). Extensions: `pgcrypto` (gen_random_uuid).

```sql
-- Enums
user_role:         TEAM_MEMBER | ADMIN
task_status:       TODO | IN_PROGRESS | BLOCKED | COMPLETED | CANCELLED
task_priority:     LOW | MEDIUM | HIGH | URGENT
activity_type:     TASK_CREATED | TASK_REASSIGNED | TASK_UPDATED | STATUS_CHANGED
                   | PROGRESS_SUBMITTED | TASK_COMPLETED | TASK_CANCELLED
notification_type: TASK_ASSIGNED | TASK_REASSIGNED | TASK_UPDATED | STATUS_CHANGED
                   | PROGRESS_SUBMITTED | TASK_COMPLETED | TASK_BLOCKED
```

```sql
users (
  id          uuid PK REFERENCES auth.users(id) ON DELETE CASCADE,   -- ADR-6
  email       text NOT NULL UNIQUE CHECK (email = lower(email)),
  full_name   text NOT NULL DEFAULT '',
  avatar_url  text,
  role        user_role NOT NULL DEFAULT 'TEAM_MEMBER',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)

tasks (
  id           uuid PK DEFAULT gen_random_uuid(),
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  text NOT NULL DEFAULT '' CHECK (char_length(description) <= 10000),
  created_by   uuid NOT NULL REFERENCES users(id),
  assigned_to  uuid NOT NULL REFERENCES users(id),
  status       task_status  NOT NULL DEFAULT 'TODO',
  priority     task_priority NOT NULL DEFAULT 'MEDIUM',
  due_date     timestamptz NOT NULL,                                  -- EC-T8: required
  completed_at timestamptz,        -- maintained by trigger (EC-T4)
  created_at / updated_at          -- updated_at via trigger
)
-- Indexes: (assigned_to, status), (created_by), (status), (priority),
--          (due_date), (updated_at DESC)

task_updates (            -- immutable progress reports (A3)
  id         uuid PK DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id),
  author_id  uuid NOT NULL REFERENCES users(id),
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  percent    smallint CHECK (percent BETWEEN 0 AND 100),              -- EC-P1
  new_status task_status,          -- transition requested with this update, if any
  created_at timestamptz NOT NULL DEFAULT now()
)
-- Index: (task_id, created_at DESC)

notifications (
  id           uuid PK DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id),
  type         notification_type NOT NULL,
  task_id      uuid REFERENCES tasks(id),
  title        text NOT NULL,
  message      text NOT NULL DEFAULT '',
  read_at      timestamptz,        -- NULL = unread
  created_at   timestamptz NOT NULL DEFAULT now()
)
-- Indexes: (recipient_id, created_at DESC);
--          partial (recipient_id) WHERE read_at IS NULL  → O(1)-ish badge count
-- FR33/D2: recipient resolution centralized in trigger helper → preference table can
-- slot in later without schema change to this table.

task_activity (           -- append-only audit (FR24, SEC-17)
  id         uuid PK DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id),
  actor_id   uuid REFERENCES users(id),      -- NULL = system
  type       activity_type NOT NULL,
  detail     jsonb NOT NULL DEFAULT '{}',    -- e.g. {"from":"TODO","to":"IN_PROGRESS"} or changed-field summary
  created_at timestamptz NOT NULL DEFAULT now()
)
-- Index: (task_id, created_at DESC)
```

**Realtime publication:** `notifications` and `tasks` are added to `supabase_realtime`; subscriptions are authenticated and RLS-filtered.

## 4. Authentication & Provisioning (ADR-1)

### Flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js
  participant G as Google
  participant S as Supabase Auth
  participant P as Postgres
  B->>N: "Continue with Google"
  N->>G: signInWithOAuth (hd=folio3.com as UX hint only — SEC-2)
  G-->>S: OAuth code/tokens (verified identity)
  S->>P: INSERT auth.users (first login only)
  P->>P: TRIGGER handle_new_auth_user():<br/>reject unless email_verified AND domain = folio3.com;<br/>else INSERT public.users (role TEAM_MEMBER)
  alt rejected
    P-->>S: transaction aborts → auth error
    S-->>B: callback error → /access-denied (signed out, no rows anywhere)
  else provisioned
    S-->>N: session → /auth/callback exchanges code
    N->>P: load profile (RLS) — missing profile ⇒ signOut + /access-denied (backstop)
    N-->>B: redirect by role → /admin or /my
  end
```

### Enforcement layers (SEC-3)

1. **`private.handle_new_auth_user()`** — BEFORE INSERT trigger on `auth.users`, SECURITY DEFINER: normalizes email to lowercase; requires provider-verified email; requires domain **exactly equal** (case-insensitive) to the configured domain — split on the final `@`, full-string compare, never `LIKE`/`endsWith` (EC-A3); on failure `RAISE EXCEPTION` → the auth transaction rolls back (no auth user, no session). On success inserts the `public.users` row in the same transaction (`ON CONFLICT DO NOTHING` — EC-A4).
2. **Allowed domain configuration:** `private.app_settings` table seeded by migration with `allowed_domain = 'folio3.com'`; the app layer reads `FOLIO3_GOOGLE_DOMAIN`. Both exist; the DB value is authoritative. Parity asserted by a test.
3. **Callback route** (`/auth/callback`): exchanges the code; any auth error → `/access-denied`. On success loads the profile; a session **without** a profile (should be impossible) is signed out and denied — the backstop.
4. **RLS backstop:** every policy requires `private.is_provisioned()` — an authenticated session with no `users` row reads/writes nothing.
5. **Profile refresh (EC-A5):** AFTER UPDATE trigger on `auth.users` (metadata change) syncs `full_name`/`avatar_url`; never touches `role` or `email` identity semantics.
6. Optional hardening if plan allows: Supabase **Before User Created** auth hook duplicating the domain check ahead of the DB. Additive only; the trigger remains the foundation.

Supabase Auth config: **Google provider only** — email/password, magic link, phone, anonymous all disabled (SEC-1). Session handling via `@supabase/ssr` cookie helpers; middleware refreshes tokens (SEC-4).

## 5. Authorization & RLS

### Helper functions (ADR-2), schema `private` (not exposed via PostgREST)

```sql
private.is_provisioned() → EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()))
private.is_admin()       → EXISTS (… AND role = 'ADMIN')          -- SECURITY DEFINER, STABLE
```

### Policy matrix (final — implements SEC-8)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | provisioned users: all rows (ADR-7) | — none (trigger-only) | — none (profile sync + role changes bypass RLS via definer trigger / operator SQL) → Test 11 fails closed at DB | — none |
| `tasks` | admin: all · member: `assigned_to = uid` | admin only (`created_by = uid` enforced WITH CHECK) | **admin only**; member path exists solely through `submit_progress_update()` RPC (ADR-3) | — none (A1/FR16) |
| `task_updates` | admin: all · member: updates on own assigned tasks | member/admin-assignee via RPC only (definer); no direct policy | — none (A3/SEC-18) | — none |
| `notifications` | `recipient_id = uid` | — none (trigger-only) | `recipient_id = uid`, guard trigger restricts change to `read_at` only | — none |
| `task_activity` | admin: all · member: activity of own assigned tasks | — none (trigger-only) | — none (SEC-17) | — none |

Notes: `anon` role has **zero** policies — an unauthenticated client sees nothing. "— none" means no policy exists, so RLS denies outright; writes happen only inside SECURITY DEFINER functions/triggers that carry their own validation. Role changes in Phase 1 are operator SQL through the Supabase dashboard (service context, bypasses RLS by design, documented in README).

### Server-layer authorization (independent of RLS)

- `lib/auth/session.ts`: `getProfile()` (per-request, React `cache()`-deduped), `requireUser()`, `requireAdmin()` — every Server Action and admin layout calls the appropriate guard **at execution time** (EC-R2); RLS then re-enforces underneath (SEC-7).
- Middleware does session refresh + "authenticated at all" redirects only — never role checks (no DB round-trip per asset request); role gates live in server layouts + actions + RLS.

## 6. Write Paths, Fan-out & RPCs (ADR-3, ADR-4)

### RPCs (SECURITY DEFINER, `public`, validated internally)

```sql
submit_progress_update(p_task_id uuid, p_body text, p_percent smallint DEFAULT NULL,
                       p_new_status task_status DEFAULT NULL)
-- 1) caller provisioned; task exists; caller = tasks.assigned_to  (EC-P3/P4: checked NOW)
-- 2) task status NOT IN (COMPLETED, CANCELLED)                    (EC-T6)
-- 3) p_new_status, if given, IN (IN_PROGRESS, BLOCKED, COMPLETED) (D3/EC-T5)
-- 4) INSERT task_updates; UPDATE tasks.status if requested
--    → triggers emit activity + notifications atomically

mark_all_notifications_read()
-- UPDATE … SET read_at = now() WHERE recipient_id = uid AND read_at IS NULL  (EC-N3)
```

Single notifications are marked read by direct UPDATE under the `notifications` policy.

### Triggers (fan-out — same transaction as the data write)

| Trigger | Emits |
|---|---|
| `tasks` AFTER INSERT | activity `TASK_CREATED`; notification `TASK_ASSIGNED` → assignee (skip if actor = assignee, EC-T3) |
| `tasks` AFTER UPDATE | diff-based: reassignment → activity `TASK_REASSIGNED` + notifications to new assignee & courtesy to old (EC-T2); status change → activity `STATUS_CHANGED` (+`TASK_COMPLETED`/`TASK_CANCELLED`) + notification per ADR-8 (`TASK_BLOCKED`/`TASK_COMPLETED` typed for creator when member acted); field edits → **one** activity `TASK_UPDATED` with changed-field summary + **one** notification (EC-N6). Recipients always `{assignee, creator} − {actor}` (ADR-8). Also maintains `completed_at` (set on → COMPLETED, cleared on leaving — EC-T4) and `updated_at`. |
| `task_updates` AFTER INSERT | activity `PROGRESS_SUBMITTED`; notification `PROGRESS_SUBMITTED` → task creator (skip self) |
| `users` guard triggers | block `role`/identity changes outside operator context (SEC-6); `updated_at` maintenance |

Actor identity inside triggers: `auth.uid()` from the request JWT (present in RPC and PostgREST/server-action writes); NULL ⇒ system/operator.

## 7. Next.js Application Structure

```
src/
  app/
    (public)/login/page.tsx            # "Continue with Google" — the ONLY auth surface
    (public)/access-denied/page.tsx    # EC-A1 friendly rejection + sign-out
    auth/callback/route.ts             # code exchange + backstop checks (§4)
    (app)/                             # authenticated shell: header, nav, notification bell
      layout.tsx                       # requireUser() + profile context + Realtime provider
      page.tsx                         # role router → /admin or /my (FR5)
      admin/                           # ADMIN ONLY
        layout.tsx                     #   requireAdmin() guard (server-side)
        page.tsx                       #   Admin Dashboard (FR34: stats, recent, unread)
        tasks/page.tsx                 #   global list + search/filters (FR17)
        tasks/new/page.tsx             #   create task (FR10)
        tasks/[id]/page.tsx            #   detail + edit + updates + activity (FR15)
        team/page.tsx                  #   members list
      my/
        page.tsx                       #   Member Dashboard (FR35)
        tasks/page.tsx                 #   my tasks + filters (FR18)
        tasks/[id]/page.tsx            #   detail + submit progress (FR19)
      notifications/page.tsx           #   notification center (FR30)
    api/                               # (none needed beyond auth callback in Phase 1)
  middleware.ts                        # @supabase/ssr session refresh + coarse auth redirect
  lib/
    supabase/{server.ts,client.ts,middleware.ts}   # typed clients (generated DB types)
    auth/session.ts                    # getProfile / requireUser / requireAdmin
    validation/*.ts                    # Zod schemas (shared client/server)
    types/{database.ts,domain.ts}      # supabase gen types + app types
    utils/{dates.ts,errors.ts}         # overdue calc (FR36/EC-T7), error mapping
  server/actions/{tasks.ts,progress.ts,notifications.ts}
  components/
    ui/                                # buttons, badges, dialog, skeletons, empty-state
    tasks/                             # task-card, task-table, status/priority badges, filters
    notifications/                     # bell + badge, list, item
    dashboard/                         # stat cards, activity feed
```

- **Reads:** Server Components query via the user-scoped server client (RLS applies). Lists paginate (25/page) and sort server-side.
- **Mutations:** Server Actions only — each validates (Zod) → guards (`requireAdmin`/ownership) → writes via user-scoped client (RLS re-checks) → `revalidatePath`. Service-role client exists only in server-only module `lib/supabase/admin.ts`, imported by **zero** Phase 1 features (provisioning is DB-side); its presence is guarded by `server-only` package + review checklist (SEC-11).
- **Realtime (FR29/FR32):** one browser channel per session: `notifications` filtered `recipient_id=eq.{uid}` (badge + list update), `tasks` filtered `assigned_to=eq.{uid}` (member views). Events → targeted refetch/`router.refresh()`; reconnect + window-focus refetch cover EC-N5. Admin surfaces use focus/interval refetch instead of a firehose subscription.
- **UI states:** every route ships `loading.tsx` (skeletons), `error.tsx` (friendly + retry), designed empty states (NFR7); status/priority always icon + label + color (NFR5).

## 8. Validation, Errors, Accessibility

- Zod schemas: `taskCreate`, `taskEdit` (server re-validates enums/dates/lengths — SEC-14), `progressUpdate` (body 1–5000, percent 0–100, status enum subset), `notificationRead`.
- Action result contract (ADR-10); `mapDbError()` translates DB/RLS failures into friendly copy ("Unable to update the task right now. Please try again.") and logs `{ code, userId, action }` server-side — never SQL or stack traces to the client (SEC-16, NFR6).
- User text rendered as escaped plain text; no `dangerouslySetInnerHTML` (SEC-15).
- A11y: semantic landmarks, labelled controls, focus-visible styles, dialog focus trap, badge with `aria-live="polite"` unread announcements (NFR5).

## 9. Testing Architecture

Implements the [test strategy](../testing/test-strategy.md):

- **Local stack:** `supabase start`; every run `supabase db reset` (migrations + `supabase/seed.sql`: 1 admin, 2 members, representative tasks/updates/notifications). Generated types keep queries compile-checked.
- **RLS suite:** SQL/TS tests execute as forged local JWTs (anon, member A, member B, admin — local JWT secret) asserting every cell of the §5 policy matrix, both allow and deny, plus EC-R1/R3/R4, EC-N2, EC-P2/P3.
- **Integration:** Server Actions + RPCs against local Supabase (real RLS): provisioning trigger accept/reject (EC-A1–A4 — insert into `auth.users` via admin API with folio3/gmail identities), transition matrix, fan-out counts (EC-N6), race cases.
- **E2E:** Playwright; sessions minted for seeded users via local GoTrue admin (`generateLink` → `verifyOtp`) and injected as cookies — no live Google in CI (§2 of test strategy). Mobile viewports 360×640 / 390×844 for Test 13.
- **CI (GitHub Actions):** lint → typecheck → unit → integration+RLS (services: supabase) → build → E2E on PRs to `develop`/`main`.

## 10. Deployment Architecture

Per [deployment requirements](../deployment/deployment-requirements.md): Vercel (GitHub-linked, `main` → production) with `output: 'standalone'` + Dockerfile for VM portability (D5/NFR9); one production Supabase project (CLI-provisioned, D6) — `supabase db push` applies migrations; Google OAuth client (External) configured in Supabase Auth with production + local redirect URLs. Env vars per the table in deployment requirements; `FOLIO3_GOOGLE_DOMAIN` must match `private.app_settings.allowed_domain` (§4.2).

## 11. Requirements Coverage Check

FR1–FR9 → §4–§5 · FR10–FR18 → §3, §6, §7 (admin routes) · FR19–FR22 → ADR-3/§6 · FR23–FR25 → §3 `task_activity` + triggers · FR26–FR33 → §3 notifications, ADR-8, §7 Realtime · FR34–FR36 → §7 dashboards + `utils/dates.ts` · NFR1–NFR12 → §7–§10. All 30 EC-* items have a named owner above; SEC-1…19 each map to §4–§6. Gate "Architecture and database design complete": **passed**.
