# Product Requirements Document — Folio3 Task Management App

> **BMAD artifact:** PM output. This is the **source of truth** for all development work.
> Every story implemented must trace back to a requirement or epic in this document.
> Derived from the governing [initial requirements prompt](initial-prompt.md) plus the
> stakeholder decisions recorded below.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-11 | 0.1 | Initial draft — generic task app (projects, Kanban, email/password) | Claude (PM) |
| 2026-08-11 | 0.2 | Full rewrite against the governing requirements prompt: internal Folio3 app, Google OAuth + @folio3.com only, flat task model, ADMIN/TEAM_MEMBER roles, progress updates, persisted notifications, Supabase RLS. Removed: projects, Kanban, email/password auth. | Claude (Planning Agent) |
| 2026-08-12 | 0.3 | Stakeholder feedback (post-delivery): (a) Trello-style board UI — status columns with task cards; admin can move a card between columns to change status; member sees a read-only board of their tasks; (b) members can add **multiple** dated progress updates, displayed **grouped by date** to the admin; (c) a single consistent page template/format across all screens. Added Epic 8. All prior security invariants unchanged. | Claude (Planning Agent) |

## 1. Goals and Background Context

An **internal** task management web application used exclusively by Folio3 employees via their `@folio3.com` Google accounts. Administrators create and assign tasks; team members work them, report progress, and everyone stays informed through persisted in-app notifications.

Goals:

- One place for admins to create, assign, and monitor work across the team.
- Team members always know what is assigned to them, its priority, and its deadline.
- Progress flows back to the assigning admin without meetings or chat archaeology.
- Zero account administration: no signup, no passwords — Google login auto-provisions users.
- Security enforced in depth: server-side authorization **and** database-level RLS, never frontend-only.

This must be a **real, database-backed, production-deployed application** — not a mockup and not driven by fake data.

## 2. Locked Decisions

Stakeholder decisions (2026-08-11) resolving ambiguities in the governing prompt. These are binding for architecture and implementation:

| # | Decision |
|---|---|
| D1 | **OAuth consent screen is External** (no Folio3 Google org admin access). Domain enforcement is therefore entirely server-side: verified email ending in `@folio3.com`, checked at callback/provisioning time and backed by RLS. |
| D2 | **Progress/completion notifications go to the task's creator only** in Phase 1. Schema must allow per-admin notification preferences later. |
| D3 | **Team members may change the status of their own assigned tasks** (e.g. IN_PROGRESS, BLOCKED, COMPLETED) as part of submitting a progress update. Admins may set any status at any time. |
| D4 | **Admins can be assignees.** Any user (ADMIN or TEAM_MEMBER) may be selected as a task assignee; admins also see their own assigned tasks. |
| D5 | **Hosting: Vercel free tier initially**, deployed from GitHub — but the app **must remain portable to a self-hosted VM (Azure/AWS)**: Next.js `output: 'standalone'` + Dockerfile, no Vercel-proprietary services, env-var-only configuration. |
| D6 | **Supabase project is provisioned by Claude via the Supabase CLI** (user supplies an access token at setup time). |
| D7 | **Two or more @folio3.com test accounts** are available for manual OAuth verification (one promoted to ADMIN, one TEAM_MEMBER). |
| D8 | **A personal Gmail account is available** to manually verify the non-Folio3 rejection flow in production. |

## 3. Assumptions

Documented per Section 47 of the governing prompt ("Make reasonable assumptions when necessary. Document assumptions."):

- **A1 — No hard delete of tasks in Phase 1.** The governing prompt lists create/update/status-change but never task deletion; `CANCELLED` status covers retiring tasks. This also keeps activity history and notification references intact.
- **A2 — Assignee picker contains provisioned users only.** There is no Google Workspace directory sync; an employee appears as a candidate assignee only after their first login. Documented as a known limitation.
- **A3 — Progress updates are immutable once submitted** (no edit/delete by anyone through the app), satisfying "historical activity should not be freely editable."
- **A4 — Deadlines are dates with timezone-aware storage** (`timestamptz`); "overdue" means `due_date < now()` and status not in (`COMPLETED`, `CANCELLED`).
- **A5 — Deprovisioning is handled by Google.** When Folio3 disables an employee's Google account, they can no longer complete OAuth; active sessions expire naturally. No in-app user deactivation in Phase 1 (documented limitation).
- **A6 — All admins can view all tasks and all progress updates** (the admin dashboard is global); D2 only scopes *notifications*, not visibility.
- **A7 — Email notifications are out of scope**; notifications are in-app (persisted + realtime) only.
- **A8 — English-only UI** in Phase 1.

## 4. Users and Roles

Two roles, stored server-side in the `users` table. New users always default to `TEAM_MEMBER`. Roles are changed **only** by a database administrator via direct SQL in Phase 1 (no role UI, no API path).

| Capability | ADMIN | TEAM_MEMBER |
|---|---|---|
| Access Admin Dashboard (global task view, stats, search/filter) | ✅ | ❌ |
| Create / edit / reassign tasks; set priority & deadline | ✅ | ❌ |
| Change any task's status | ✅ | Own assigned tasks only (via progress update) |
| View all tasks & all progress updates | ✅ | Own assigned tasks only |
| View team members list | ✅ | ❌ |
| Submit progress updates | On own assigned tasks (D4) | On own assigned tasks |
| Receive notifications | As task creator (D2) + as assignee | As assignee |
| Notification center, badges, mark read / mark all read | ✅ (own only) | ✅ (own only) |
| Change any role | ❌ (DB-only in Phase 1) | ❌ |

## 5. Authentication & Provisioning Flow

```
Open app → "Continue with Google" → Google OAuth (Supabase Auth)
  → Server verifies: email_verified AND email domain == folio3.com (case-insensitive, exact match)
      ├─ FAIL → sign out, show Access Denied page, no profile row
      └─ PASS → upsert-by-auth-id into users (first login: create with role TEAM_MEMBER;
                repeat login: no duplicate, existing role preserved)
  → Load role from DB → route to Admin Dashboard or Team Member Dashboard
```

Hard rules (from governing prompt Sections 2–3): no signup page, no username/password, no manual account creation form, no duplicate user rows ever, users can never influence their own role.

## 6. Functional Requirements

### Authentication & Provisioning

- **FR1:** The only sign-in method is "Continue with Google" via Supabase Auth + Google OAuth. No signup, password, or manual account-creation path exists.
- **FR2:** Only Google accounts with a **verified** email on the exact domain `folio3.com` (case-insensitive) may access the application. All others are signed out and shown an Access Denied page; no `users` profile row is created for them.
- **FR3:** First successful Folio3 login automatically creates a `users` row (auth identity id, email, full name, avatar URL if available) with role `TEAM_MEMBER`.
- **FR4:** Repeat logins never create duplicate rows (unique constraints on auth identity id and email); the existing role is preserved.
- **FR5:** After login the user's DB role determines their landing surface: ADMIN → Admin Dashboard, TEAM_MEMBER → Team Member Dashboard.
- **FR6:** Sessions persist across page refresh; sign-out is available everywhere.

### Roles & Authorization

- **FR7:** Roles are exactly `ADMIN` and `TEAM_MEMBER` (extensible enum), stored in the `users` table, defaulting to `TEAM_MEMBER`.
- **FR8:** No UI or API path can change a role in Phase 1; promotion happens via direct database update by an authorized operator (documented procedure).
- **FR9:** Every privileged operation is authorized server-side **and** by RLS; UI hiding is a usability measure only. Team members cannot: create/assign tasks, access the admin dashboard or admin data, read or modify other users' tasks/updates/notifications, or change any role including their own.

### Tasks

- **FR10:** Admins create tasks with: title (required), description, assignee (required), priority, due date. Input is validated server-side.
- **FR11:** Any provisioned user (ADMIN or TEAM_MEMBER) can be the assignee (D4).
- **FR12:** Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Both modeled so values can be extended without schema surgery.
- **FR13:** Admins can edit any task field, change status, and reassign at any time. `COMPLETED` sets a `completed_at` timestamp; reopening clears it.
- **FR14:** Team members see only tasks assigned to them (list + detail). Direct navigation to another user's task is denied server-side and by RLS.
- **FR15:** Task detail view shows: title, description, assignee, creator, status, priority, deadline, created/updated timestamps, progress updates, and the activity timeline — visually distinguishing the original task, admin edits, member progress reports, status changes, and system events.
- **FR16:** Tasks are never hard-deleted in Phase 1 (A1); `CANCELLED` retires them.
- **FR17:** Admin task search (title, description, assignee name/email) and filters: status, priority, assignee, due date, creation date, last-updated date. Combinable, with sensible sorting.
- **FR18:** Team member task filtering: status, priority, deadline.

### Progress Updates

- **FR19:** A team member (or admin-assignee, D4) can submit a progress update on a task assigned to them: text (required), optional percentage 0–100, optional status transition (D3).
- **FR20:** Status transitions via progress update are restricted to the member's own assigned tasks; permitted target statuses: `IN_PROGRESS`, `BLOCKED`, `COMPLETED`.
- **FR21:** Progress updates are immutable once submitted (A3).
- **FR22:** Admins can view every progress update; team members can view all updates on their own tasks.

### Task Activity

- **FR23:** The system records an activity event for: task created, task assigned/reassigned, fields edited, status changed (by whom), progress submitted, task completed, task cancelled.
- **FR24:** Activity records are append-only: no user-facing update or delete path, enforced at the database layer.
- **FR25:** Activity is visible on the task detail to the task's assignee and to admins.

### Notifications

- **FR26:** Notifications are persisted in the database (not toast-only) with: recipient, type, related task, title, message, read state, created timestamp, destination link.
- **FR27:** The assignee is notified when: a task is assigned to them, a task of theirs is edited by an admin (including deadline/priority/status changes), or it is reassigned away (courtesy notice).
- **FR28:** The task's **creator** is notified when (D2): the assignee submits a progress update, changes status (including `BLOCKED`), or completes the task. Self-triggered events never notify the actor.
- **FR29:** An unread-count badge appears throughout the app (header/nav, mobile included), updates live on create/read, and disappears at zero.
- **FR30:** The notification center lists notifications with unread distinction; opening one navigates to the related task and marks it read; "mark all as read" is available.
- **FR31:** Users can read and modify (mark read) **only their own** notifications — enforced server-side and by RLS.
- **FR32:** Notification and dashboard data updates in near-real-time via Supabase Realtime, with efficient refetch/polling as fallback where realtime is not justified.
- **FR33:** The notification schema accommodates future per-admin subscription preferences without migration pain (D2).

### Dashboards

- **FR34:** Admin Dashboard shows: counts for total / TODO / in-progress / completed / blocked / overdue tasks, recently updated tasks, recent team activity, and unread notification count — plus the searchable/filterable task list (FR17).
- **FR35:** Team Member Dashboard shows: the member's assigned tasks with status/priority/deadline, a "needs attention" section (overdue, blocked, due soon), recently updated tasks, recent own activity, unread notifications. No administrative controls are rendered.
- **FR36:** "Overdue" everywhere means `due_date` in the past and status not `COMPLETED`/`CANCELLED` (A4).

## 7. Non-Functional Requirements

- **NFR1 — Responsive:** Intentional layouts for desktop, laptop, tablet, and phones (iOS Safari, Android Chrome); no horizontal scrolling; touch-friendly targets; responsive navigation, cards, forms, dialogs, notification center, and dashboards.
- **NFR2 — Performance:** Common interactions (open dashboard, open task, create/update, submit progress) feel < 500 ms; every async operation has a meaningful loading state.
- **NFR3 — Security layers:** Google OAuth → server-side Folio3 domain validation → DB-stored role → server-side authorization → RLS → Postgres constraints. Service-role key server-only; secrets only in env vars; `.env.example` with placeholders; nothing sensitive committed.
- **NFR4 — RLS mandatory** on all application tables (`users`, `tasks`, `task_updates`, `notifications`, `task_activity`).
- **NFR5 — Accessibility:** Semantic HTML, keyboard navigability, visible focus states, labeled forms/controls, appropriate ARIA, adequate contrast; status/priority never communicated by color alone.
- **NFR6 — Error handling:** Friendly user-facing messages (no stack traces/internal errors); technical details logged server-side; auth, network, DB, and validation failures all handled.
- **NFR7 — Empty states** for every list surface ("No tasks assigned to you yet", "You're all caught up", …).
- **NFR8 — Code quality:** TypeScript strict mode, minimal `any`, lint + typecheck green in CI, no giant files/components, clean separation (UI / routes / server logic / auth / db / validation / types / utils / tests).
- **NFR9 — Portability (D5):** `output: 'standalone'` + Dockerfile; no Vercel-proprietary runtime services; runs identically on a VM behind a reverse proxy.
- **NFR10 — Reproducible migrations:** A fresh Supabase project reaches the full schema (tables, constraints, indexes, RLS, policies, functions/triggers) from migration files alone.
- **NFR11 — Tested:** Unit, integration, RLS/authorization, and E2E suites per the [test strategy](../testing/test-strategy.md); the 13 mandated E2E scenarios all covered.
- **NFR12 — Browser support:** Current Chrome, Safari, Edge, Firefox.

## 8. UI/UX Principles

Clean, professional internal tool — not an over-engineered enterprise suite. Clear hierarchy, consistent typography/spacing, obvious status & priority indicators (icon/label + color), loading/error/empty states everywhere, usability over visual complexity.

## 9. Epics and User Stories

Stories are sharded into `docs/stories/` when they enter development (BMAD). Acceptance criteria below are the planning-level contract; sharded stories may refine them.

### Epic 1 — Foundation & Infrastructure

**Goal:** A deployable skeleton with CI, a provisioned Supabase project, and the reproducible base schema.

- **Story 1.1 — Project scaffold.** Next.js (App Router) + TypeScript strict + Tailwind, ESLint/Prettier, Vitest, Playwright, `output: 'standalone'` + Dockerfile.
  - AC: `build`, `lint`, `typecheck`, `test` all pass locally; repo layout matches Section 43 of the governing prompt.
- **Story 1.2 — Supabase provisioning & local dev.** Cloud project created via CLI (D6); local development against `supabase start`; migration workflow wired.
  - AC: documented fresh-clone setup works; `supabase db reset` rebuilds the schema from migrations alone (NFR10).
- **Story 1.3 — CI pipeline.** GitHub Actions: lint + typecheck + unit/integration tests on every PR to `develop`; failing checks block merge.
  - AC: a deliberately broken PR shows red; green required to merge.
- **Story 1.4 — Base schema & RLS migration.** Tables `users`, `tasks`, `task_updates`, `notifications`, `task_activity`; enums for role/status/priority; FKs, unique constraints, indexes; RLS enabled on all tables with the policy set from the architecture.
  - AC: schema reproducible on a fresh project; RLS enabled everywhere; anon role sees nothing.

### Epic 2 — Authentication & User Provisioning

**Goal:** Google-only login, watertight Folio3 domain gate, automatic user creation. (FR1–FR9)

- **Story 2.1 — Google sign-in.** "Continue with Google" via Supabase Auth; SSR session handling; sign-out.
  - AC: FR1, FR6; session survives refresh; no signup/password surfaces exist anywhere.
- **Story 2.2 — Domain enforcement.** Server-side verification of `email_verified` + exact `folio3.com` domain at callback; rejection signs the user out and shows Access Denied; auth-layer hook/design per architecture ensures rejected identities get no data access and no profile row.
  - AC: FR2; personal Gmail denied via UI **and** via direct API/session attempts; no `users` row created (verified in tests).
- **Story 2.3 — Auto-provisioning.** First Folio3 login upserts the `users` profile (role `TEAM_MEMBER`); concurrent first logins safe; repeat logins reuse the row.
  - AC: FR3, FR4; parallel-login race test yields exactly one row; role survives relogin (Tests 1, 2, 4).
- **Story 2.4 — Role-based routing & guards.** DB role drives landing dashboard; every admin route/server action/API verifies ADMIN server-side.
  - AC: FR5, FR9; member requesting an admin surface or action receives a server-side denial (Test 12 foundation).
- **Story 2.5 — Auth UX.** Login page, Access Denied page, auth error states, friendly copy.
  - AC: NFR6; no stack traces; denied users get a clear explanation and a way to sign out/retry.

### Epic 3 — Task Management (Admin)

**Goal:** Admins create, assign, edit, and track tasks end to end. (FR10–FR17)

- **Story 3.1 — Create & assign task.** Validated form (title, description, assignee from provisioned users, priority, due date); on save: task row + activity event + assignee notification.
  - AC: FR10–FR12, FR23, FR27; Test 6 passes end to end.
- **Story 3.2 — Edit, status, reassign.** Admin edits any field; status changes tracked; reassignment moves visibility and notifies both old (courtesy) and new assignee.
  - AC: FR13; activity + notifications recorded; `completed_at` behavior correct.
- **Story 3.3 — Task detail (admin view).** Full task view per FR15 with clearly separated sections: task fields, progress updates, activity timeline.
  - AC: FR15, FR22, FR25.
- **Story 3.4 — Admin task list, search & filters.** Global task table with FR17 search/filter/sort; overdue highlighting (FR36).
  - AC: FR17; filters combinable; responsive on mobile.

### Epic 4 — Team Member Experience & Progress

**Goal:** Members see exactly their work and report progress against it. (FR14, FR18–FR22)

- **Story 4.1 — My tasks list & filters.** Member task list restricted to own assignments with status/priority/deadline filters.
  - AC: FR14, FR18; another user's task is unreachable (UI + server + RLS).
- **Story 4.2 — Task detail (member view).** Full read view of own task incl. updates & activity; no admin controls rendered.
  - AC: FR15 (member scope), FR25.
- **Story 4.3 — Submit progress update.** Text + optional % + optional status transition (IN_PROGRESS/BLOCKED/COMPLETED); immutable after submit; creates activity + creator notification.
  - AC: FR19–FR21, FR28; Test 7 passes; disallowed transitions rejected server-side.
- **Story 4.4 — My activity/history.** Member-facing view of their recent activity across their tasks.
  - AC: FR25 scope; only own data visible.

### Epic 5 — Notifications & Realtime

**Goal:** Persistent notifications with live badges and a notification center. (FR26–FR33)

- **Story 5.1 — Notification engine.** DB-persisted notifications created for every FR27/FR28 event, schema future-proofed for preferences (FR33); self-actions never notify the actor.
  - AC: FR26–FR28; recipients scoped per D2.
- **Story 5.2 — Unread badge.** Global badge with live count via Realtime subscription (+ refetch fallback), zero-state hides badge; accessible (announced, not color-only).
  - AC: FR29, FR32; Test 9 badge behavior.
- **Story 5.3 — Notification center.** List with read/unread, open → navigate + mark read, mark all read; own-notifications-only enforced.
  - AC: FR30, FR31; Test 9 passes fully.
- **Story 5.4 — Live dashboard updates.** Task lists/dashboards reflect changes without manual reload where it adds value (Realtime or focus-refetch).
  - AC: FR32; Test 8's "team member sees update" satisfied.

### Epic 6 — Dashboards & Polish

**Goal:** Role-appropriate dashboards, responsive & accessible throughout. (FR34–FR36, NFR1, NFR5, NFR7)

- **Story 6.1 — Admin Dashboard.** Stat cards (total/TODO/in-progress/completed/blocked/overdue), recently updated, recent activity, unread count; links into filtered task list.
  - AC: FR34, FR36; correct counts verified against seeded data.
- **Story 6.2 — Team Member Dashboard.** Assigned tasks, "needs attention" (overdue/blocked/due soon), recent updates/activity, unread count.
  - AC: FR35; prioritizes the signed-in member's work.
- **Story 6.3 — Responsive & accessibility pass.** Systematic pass over every surface for NFR1 + NFR5; loading/error/empty states audit (NFR2, NFR6, NFR7).
  - AC: Test 13 checklist green at representative viewports; keyboard-only walkthrough succeeds.

### Epic 7 — Hardening, Verification & Deployment

**Goal:** Prove the security model, run the mandated test suite, ship to production. (Sections 35–39 of the governing prompt)

- **Story 7.1 — Authorization & RLS test suite.** Automated tests for IDOR (Test 10), privilege escalation / self-role-change (Test 11), admin-only actions (Test 12), non-Folio3 rejection (Test 3, automated layer), across API and database layers.
  - AC: all negative tests demonstrably fail closed.
- **Story 7.2 — E2E suite.** Playwright coverage of Tests 1–13 via the session-injection strategy in the [test strategy](../testing/test-strategy.md); manual OAuth verification script prepared for the human (D7, D8).
  - AC: automated tests pass in CI; manual script documented with expected results.
- **Story 7.3 — Code review & fix loop.** Full review per Section 38; CRITICAL/HIGH fixed and re-verified before deployment; findings archived in `docs/code-review/`.
  - AC: zero unresolved CRITICAL/HIGH.
- **Story 7.4 — Production deployment.** Vercel project from GitHub, production Supabase config, Google OAuth redirect URLs, env vars; Section 39 checklist executed; deployment verified live; full README per Section 42; VM self-hosting runbook (D5).
  - AC: production URL works with real Folio3 login; Section 45 acceptance checklist reviewed item by item.

### Epic 8 — Trello-Style Board, Dated Progress & Consistent Template (v0.3)

**Goal:** Rework the task surfaces into a Trello-like board experience, make multi-update progress reporting first-class and date-grouped, and unify the page template across the app. All security invariants from Epics 1–7 are unchanged.

New functional requirements (additive; FR-numbering continues):

- **FR37 — Board view.** Tasks are shown on a Trello-style board with a column per active status (To do, In progress, Blocked, Completed) and task cards (title, priority, assignee, due date, overdue flag, latest progress %). Card counts per column.
- **FR38 — Admin board interaction.** An admin can change a task's status by moving its card between columns (drag-and-drop) **and** via a keyboard-accessible status control on the card (NFR5). The change persists through the same admin-only server path (RLS admin-only; activity + notification fan-out unchanged). No new client authority.
- **FR39 — Member board.** A member sees a **read-only** board of their own assigned tasks grouped by status; opening a card leads to the task detail where they report progress. (Members still change status only via progress updates — D3 — so the member board is not drag-interactive.)
- **FR40 — Multiple dated progress updates.** A member can add many progress updates over time to an assigned task (already append-only/immutable). The task detail displays them **grouped by calendar date** (date headers, newest first) for both the member and the admin, so the admin can read the member's progress history by date.
- **FR41 — Consistent template.** Every page uses one shared layout template: a common `PageHeader` (title, subtitle, actions) and consistent content/card/column styling, so all screens share structure and format.

Stories:

- **Story 8.1 — Shared template & board primitives.** `PageHeader`; Trello-style `TaskCard`, `BoardColumn`, `Board`; consistent board/card styling. AC: reused by all board/list surfaces; FR41.
- **Story 8.2 — Admin board.** `/admin/board` with drag-and-drop + status select → `moveTaskStatusAction` (admin-only). AC: FR37/FR38; moving a card changes status, records activity, notifies; RLS still blocks non-admins.
- **Story 8.3 — Member board.** `/my/board` read-only columns of own tasks; card → detail. AC: FR39; no status mutation from the member board; RLS-scoped.
- **Story 8.4 — Dated progress history.** Group `task_updates` by date on the shared task detail; member can add multiple. AC: FR40; admin sees all of a member's updates by date; updates remain immutable.
- **Story 8.5 — Template rollout.** Apply `PageHeader`/shared template to every page; add Board to nav. AC: FR41; visual/structural consistency.
- **Story 8.6 — Playwright coverage.** E2E for board rendering, admin status-move, member read-only board, member adding multiple updates + admin viewing the dated history. AC: green in CI.

## 10. Traceability

- Governing prompt Sections 1–30 → FR1–FR36 / NFR1–NFR12 above; v0.3 feedback → FR37–FR41 / Epic 8.
- The 13 mandated E2E tests → Epic 2 (Tests 1–5), Epic 3 (Tests 6, 8), Epic 4 (Test 7), Epic 5 (Tests 8–9), Epic 7 (Tests 3, 10–12), Epic 6 (Test 13); Epic 8 adds board + dated-progress E2E.
- Section 45 final acceptance checklist → verified at Story 7.4.

## 11. Out of Scope

Role-management UI (explicitly deferred), projects/workspaces, comments distinct from progress updates, email/push notifications, file attachments, time tracking, reporting/exports, directory sync (A2), user deactivation UI (A5), PWA, localization. (The Trello-style **board** is now IN scope as of v0.3; "Kanban" was previously out of scope under v0.2.)

## 12. Related Documents

- [Initial requirements prompt (verbatim, governing)](initial-prompt.md)
- [Project brief](project-brief.md)
- [Edge cases](edge-cases.md) · [Security requirements](security-requirements.md) · [Roadmap](roadmap.md)
- [Test strategy](../testing/test-strategy.md) · [Deployment requirements](../deployment/deployment-requirements.md)
- [Architecture](../architecture/architecture.md) (Phase 2 output)
