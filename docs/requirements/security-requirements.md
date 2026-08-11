# Security Requirements — Folio3 Task Management App

> **BMAD/Planning artifact.** Binding requirements for the Architect (policy design), Developer (implementation), Tester (adversarial tests), and Code Reviewer (checklist). Security is a first-class requirement (governing prompt Section 29).

## 1. Defense-in-Depth Model

Every request passes through independent layers; **no layer trusts the one above it**:

```
1. Google OAuth (identity)                    — proves who the caller is
2. Folio3 domain validation (server-side)     — verified email, exact domain folio3.com
3. Provisioned identity (users row)           — no profile ⇒ no access
4. Application role (DB-stored)               — ADMIN / TEAM_MEMBER, never client-supplied
5. Server-side authorization                  — every server action / route handler checks role & ownership
6. Supabase Row Level Security                — database independently re-enforces the same rules
7. PostgreSQL constraints                     — FKs, uniques, checks as the last line
```

Frontend hiding of controls is **usability only** and never counts as enforcement.

## 2. Authentication Requirements

- **SEC-1:** Google OAuth via Supabase Auth is the only authentication path. No password, magic-link, or anonymous auth enabled on the Supabase project.
- **SEC-2:** Because the consent screen is **External** (Decision D1), the `hd` parameter is treated as a UX hint at most — **never** as enforcement. Enforcement is: `email_verified = true` AND email domain exactly equals `folio3.com`, case-insensitive, full-domain match (no `endsWith`/substring logic — see EC-A3).
- **SEC-3:** The domain gate executes server-side at a point the client cannot bypass (auth callback and/or database trigger/auth hook per architecture. The architecture must guarantee a rejected identity: gets signed out, gets no `users` row, and — even if an `auth.users` entry exists — can access zero application data (RLS predicates require a matching provisioned Folio3 profile).
- **SEC-4:** Sessions use Supabase's secure cookie/token handling via the SSR helpers; tokens never placed in URLs or localStorage beyond what the official SDK does; bounded lifetimes with refresh.

## 3. Authorization Requirements

- **SEC-5:** Role lives **only** in the database. It is never accepted from the client, a form field, a header, or a JWT claim the client can influence. If custom claims are used for performance, they must be minted server-side (auth hook) and re-verified against the DB for privileged mutations.
- **SEC-6:** No API surface (server action, route handler, PostgREST, RPC) allows any user to insert/update their own or others' `role` in Phase 1. Role changes happen only via direct DB access by an operator. RLS must exclude `role` from user-writable columns (column-level protection or trigger guard).
- **SEC-7:** Every privileged operation re-checks authorization server-side at execution time (not render time): admin-only mutations verify ADMIN from the DB; member mutations verify ownership (`assigned_to = caller`).
- **SEC-8:** RLS policy matrix (minimum — Architect refines exact predicates):

| Table | TEAM_MEMBER | ADMIN | Notes |
|---|---|---|---|
| `users` | SELECT own row (+ minimal directory fields needed for display, per architecture) | SELECT all | INSERT via provisioning path only; `role` not client-writable by anyone (SEC-6) |
| `tasks` | SELECT where `assigned_to = self`; UPDATE restricted to permitted status transitions on own tasks (D3) — via guarded policy or SECURITY DEFINER RPC | SELECT all; INSERT; UPDATE all fields | No DELETE for anyone (Phase 1, PRD A1) |
| `task_updates` | SELECT on own tasks; INSERT where task `assigned_to = self`; no UPDATE/DELETE | SELECT all; no UPDATE/DELETE | Immutability (PRD A3) enforced at DB |
| `notifications` | SELECT/UPDATE(read-state only) where `recipient = self` | same as member (own only) | INSERT server-side only (definer function/trigger) |
| `task_activity` | SELECT where related task `assigned_to = self` | SELECT all | INSERT server-side only; no UPDATE/DELETE for anyone |

- **SEC-9:** RLS policies that need role lookups must avoid recursive-policy pitfalls (SECURITY DEFINER helper function or server-minted claims — Architect decides; Reviewer verifies no infinite recursion and no definer-function privilege leak).
- **SEC-10:** Explicit adversarial tests required (Tester agent): IDOR by ID iteration on tasks/updates/notifications (Test 10), self-role-change via every write surface (Test 11), admin-only mutations as member (Test 12), non-Folio3 data access with a crafted/valid session (Test 3 hardening), cross-user notification manipulation (EC-N2).

## 4. Secrets & Configuration

- **SEC-11:** `SUPABASE_SERVICE_ROLE_KEY` is server-only: never in client bundles, never in `NEXT_PUBLIC_*`, never logged. Usage confined to trusted server paths that the architecture explicitly enumerates (e.g. provisioning), each with its own authorization check.
- **SEC-12:** No secrets in source control. `.env.example` carries placeholders only; real values live in `.env.local` (gitignored) and platform env settings (Vercel/VM). OAuth client secret lives only in Supabase Auth config.
- **SEC-13:** Reviewer/CI greps for hardcoded keys, tokens, and connection strings before every deployment.

## 5. Input Handling & Output Safety

- **SEC-14:** All mutation inputs validated server-side (schema validation — lengths, enums, ranges like percent 0–100, date sanity) regardless of client validation; DB constraints mirror critical rules.
- **SEC-15:** All user-authored text (titles, descriptions, progress updates) rendered escaped; no `dangerouslySetInnerHTML` on user content; plain text only in Phase 1 (EC-T9).
- **SEC-16:** Errors returned to clients are generic and friendly; stack traces, SQL, and internal identifiers stay in server logs (NFR6).

## 6. Audit & Integrity

- **SEC-17:** `task_activity` is append-only for all roles at the database layer — an attacker with a valid session cannot rewrite history (FR24).
- **SEC-18:** Progress updates immutable post-submit (PRD A3) — DB-enforced, not just UI-absent.
- **SEC-19:** Database constraints prevent invalid relationships: FKs on all references, unique (auth id) and unique (email) on users, enum/check constraints on status, priority, role, percent.

## 7. Review Gate

Code review (Section 38) must explicitly clear: hardcoded secrets, exposed credentials, client-side-only authorization, missing/wrong RLS policies, IDOR, role escalation, self-role modification, missing validation, race conditions in provisioning and notification counting. **CRITICAL/HIGH findings block deployment.**
