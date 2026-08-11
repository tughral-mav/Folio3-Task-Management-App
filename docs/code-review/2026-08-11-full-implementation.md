# Code Review — Folio3 Task Management App (Phase 6 Security Gate)

**Date:** 2026-08-11
**Reviewer:** Independent Code Reviewer agent (adversarial, security-focused), separate context
**Scope:** `supabase/migrations/*.sql`, `src/lib/**`, `src/proxy.ts`, `src/app/auth/callback/route.ts`, `src/server/**`, `src/app/**`, `src/components/**`
**Grounding:** architecture.md (ADR-1..10), security-requirements.md (SEC-1..19), edge-cases.md (EC-*), CLAUDE.md
**Gate result:** **PASS** — 0 CRITICAL, 0 HIGH.

## Overall assessment

Defense-in-depth implementation that holds up under adversarial reading. The `@folio3.com` gate is an exact full-domain match in both the DB trigger and the app-layer backstop (no `endsWith`/substring anywhere; EC-A3 cases covered by tests). RLS is enabled on all five tables and matches the SEC-8 matrix cell-for-cell; no client-reachable path writes `users.role` (no write policy + `protect_user_identity` trigger). No service-role client exists in the codebase; the service key appears only as a placeholder. The member write-path is exclusively the `SECURITY DEFINER` RPC with an execution-time `FOR UPDATE` assignee check; all definer functions pin `search_path=''`. All user text is escaped JSX. Zero CRITICAL/HIGH.

## Findings & resolutions

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | MEDIUM | Search text interpolated into a PostgREST `.or()` filter via denylist sanitization; not exploitable (RLS gates rows; commas/parens stripped; value stays wrapped in `%…%`) but fragile — `*` maps to wildcard, `\` can malform the pattern, safety relies on an implementation detail. | **Fixed.** Replaced with an allowlist sanitizer `sanitizeSearch` (`src/lib/utils/search.ts`, keeps only `[A-Za-z0-9 @._-]`, strips `* \ " % _ , ( )`), unit-tested (`tests/unit/sanitize-search.test.ts`). |
| 2 | LOW | Member dashboard "open" count and "needs attention" computed from only the first 25 tasks — an overdue task sorting past page 1 would be dropped from the safety-net surface. | **Fixed.** New `listOpenTasks()` query (RLS-scoped, ordered by due date, bounded at 200) feeds the needs-attention computation. |
| 3 | LOW | Due date stored as `T23:59:59` local → the shown calendar day / edit default can shift ±1 across timezones. | **Fixed.** Due date now anchored to **noon UTC** (`T12:00:00Z`), stable across all real offsets. |
| 4 | LOW/info | `email_verified` falls back to `email_confirmed_at` only when the claim is entirely absent (Google always sends it; explicit `false` is honored → EC-A2 holds). | **Accepted as documented.** Google reliably provides the claim; the fallback is defense-in-depth only. Noted for future hardening (fail-closed on absent claim). |
| 5 | LOW/info | Member-driven COMPLETED/BLOCKED notifies the creator as `PROGRESS_SUBMITTED` (status embedded in the message) rather than a `TASK_COMPLETED`/`TASK_BLOCKED`-typed notification — consistent with EC-N6/EC-N1 but diverges from architecture §6 wording. | **Doc reconciled.** Behavior is correct (one consolidated notification); architecture note clarified — the consolidated notification is intentionally `PROGRESS_SUBMITTED`-typed. |
| 6a | LOW | Admin "Overdue" stat card linked to an unfiltered task list. | **Fixed.** Added an `overdue` filter to `listTasks` + the admin tasks page; the card links to `?overdue=1`. |
| 6b | LOW/info | Task embed relies on auto-generated FK constraint names. | **Accepted.** Names are correct; a rename would surface immediately in tests. |

## Verified clean (excerpt)

Domain gate (both layers, EC-A3); AFTER-INSERT provisioning trigger aborting the auth txn on reject; callback open-redirect guard + two backstops; Next 16 proxy (session refresh + coarse redirects only, no role checks); RLS matrix cell-for-cell incl. no `users.role` write path; `is_admin`/`is_provisioned` definer helpers (no recursion, always-fresh); `submit_progress_update` execution-time assignee check + no existence leak + transition/percent/closed enforcement; fan-out self-suppression + consolidation + recipient rule; no service-role client, no secrets committed; escaped output, a11y (symbol+label+color, focus, labels, landmarks), friendly errors; awaited `params`/`searchParams`; immutable updates/activity; overdue boundary.

Full reviewer narrative retained in git history / this report's commit. **Gate recommendation: PASS**; MEDIUM + actionable LOWs fixed in the same commit and re-verified by CI.
