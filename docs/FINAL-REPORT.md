# Final Report — Folio3 Task Management App

**Date:** 2026-08-11 · **Prepared for:** Human approval (Phase 10) · **Production:** https://folio3-task-management-app.vercel.app

## What was built

A real, database-backed, production-deployed internal task management web app for Folio3. Administrators create/assign/track tasks; team members work them and report progress; persisted in-app notifications with a live unread badge keep both sides informed. Access is exclusively via `@folio3.com` Google accounts — no signup, no passwords. Built through the full agent pipeline (Planning → Architecture → Development → Testing → Code Review → Deployment) on the `develop` branch.

## Technology stack

Next.js 16 (App Router, Server Components + Server Actions) · TypeScript strict · React 19 · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Realtime) · Zod · Vitest + Playwright + `pg` · Vercel (portable to a self-hosted VM via Dockerfile).

## Database architecture

Five tables — `users`, `tasks`, `task_updates`, `notifications`, `task_activity` — with enums for role/status/priority, UUID keys, FKs, unique constraints, indexes (incl. a partial index for unread counts), and `timestamptz` throughout. `users.id` *is* the Supabase auth id (no dual-ID mapping). Eight reproducible migrations; a fresh project reaches the full schema from migrations alone (verified in CI). Activity and notifications are produced by database triggers in the same transaction as each write.

## Authentication architecture

Google OAuth via Supabase Auth (External consent screen). The `@folio3.com` gate is enforced **in the database**: an `AFTER INSERT` trigger on `auth.users` verifies the email is verified and an exact full-domain match, and aborts the auth transaction otherwise (no auth user, no session, no profile). An app-layer callback backstop and RLS (`is_provisioned`) sit behind it. No signup or password path exists.

## User registration flow

First successful Folio3 login auto-creates a `public.users` row (role `TEAM_MEMBER`) inside the same transaction as the auth user; `ON CONFLICT DO NOTHING` + unique constraints make duplicates impossible. Repeat logins reuse the row and preserve role; name/avatar sync on change.

## Role architecture

Two roles, `ADMIN` and `TEAM_MEMBER` (default). Role lives only in the DB and is read every request (demotion bites immediately). No client path — action, API, or crafted request — can change `users.role` (no write policy + guard trigger). Admins are promoted by operator SQL (Phase 1; no role UI by design).

## Features implemented

- Google-only auth, Folio3 domain gate, auto-provisioning, role-routed dashboards.
- Admin: create/assign/edit/reassign tasks, any-status control, global searchable & filterable task list (status/priority/assignee/due-range/overdue), team roster, dashboard stat cards + activity feed.
- Member: own-tasks list with filters, task detail, immutable progress updates (text + optional %/status), needs-attention dashboard, activity history.
- Notifications: DB-persisted, live unread badge (Realtime), notification center with open→navigate→mark-read and mark-all-read.
- Responsive (table→cards on mobile), accessible (semantic HTML, keyboard nav, focus states, status never color-only), loading/error/empty states throughout.
- **Trello-style board (v0.3):** status columns with task cards; admin moves cards (drag-and-drop or accessible status menu) to change status; member sees a read-only board of their tasks. Progress updates grouped by date so admins read a member's history day by day. One consistent page template across all screens.

## Tests executed (actually run — results below)

| Suite | Result |
|---|---|
| Unit (Vitest) — domain gate, overdue, validation, search sanitizer | 16/16 pass |
| RLS / authorization (pg, real Postgres in CI) — IDOR, privilege escalation, admin-only, immutability, RPC rules | 23/23 pass (CI `schema` job) |
| E2E (Playwright, desktop + Pixel 7, session injection) | 36/36 pass (CI `e2e` job) — incl. board + dated-progress (v0.3) |
| Schema verification (migrations + seed + negative domain-gate test) | pass (CI) |
| Production build / typecheck / lint | pass (CI + Vercel) |
| Manual OAuth (real Google) — Tests 1,2,3,4,5 + cross-account 6,7,8 | pass (recorded; DB verified clean after Gmail rejection) |

**Mandated tests mapping (all covered):** Tests 1–5 ✅ manual (real Google) + logic in unit/RLS; Test 3 also ✅ automated (DB layer + E2E redirect); Tests 6, 7, 9 ✅ automated E2E + manual production; Tests 10, 12 ✅ automated E2E (UI) **and** RLS (DB); Test 11 ✅ automated RLS; Test 8 ✅ manual production; Test 13 ✅ automated E2E mobile viewport (Pixel 7). Only iOS Safari/WebKit remains a manual spot-check.

## Security review

Independent, separate-context adversarial review: **PASS, 0 CRITICAL / 0 HIGH.** One MEDIUM (search-filter hardening) and the actionable LOW items were fixed and re-verified the same day. Full report: [code-review/2026-08-11-full-implementation.md](code-review/2026-08-11-full-implementation.md).

## Deployment status

Live at **https://folio3-task-management-app.vercel.app** (Vercel Hobby, production branch `develop`, git auto-deploy confirmed). Supabase `acioywfrjbalyqbavmoy` (ap-south-1). Section 39 checklist executed: [deployment/section-39-checklist.md](deployment/section-39-checklist.md). Free tiers only.

## Known limitations

- iOS Safari (WebKit) is a manual spot-check; the automated mobile E2E project runs on Pixel 7 (Chromium).
- No role-management UI (deferred by design); no directory sync (assignees must have logged in once); no user-deactivation UI; English-only.
- Google OAuth app is in "Testing" status (only allow-listed test users can sign in) until the user publishes it to In Production — a one-click console action that does not affect the `@folio3.com` gate.

## Future improvements

Publish the Google OAuth app (remove test-user gating); admin role-management UI (Phase 2); full Playwright E2E journeys + axe scans in CI; email/push notifications; per-admin notification preferences (schema already accommodates); fail-closed on absent `email_verified` claim; task attachments / comments; reporting/exports.

## Human approval

Awaiting your review. The one action that unlocks the final deferred verification: add a second `@folio3.com` account (your lead) as a Google **test user**, then run the assign → progress → notify loop on production.
