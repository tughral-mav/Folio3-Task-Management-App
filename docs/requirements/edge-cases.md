# Edge Cases — Folio3 Task Management App

> **BMAD/Planning artifact.** Each case states expected behavior; the Architect and Tester agents must account for every item. IDs are referenced from stories and tests.

## Authentication & Provisioning

- **EC-A1 — Non-Folio3 Google login.** Any verified Google account not on `folio3.com` (e.g. `@gmail.com`) completes OAuth (External consent screen) but must be rejected server-side: signed out, Access Denied page, **no `users` profile row**, no data access even with a crafted session (RLS backstop).
- **EC-A2 — Unverified email.** Google identity with `email_verified = false` is rejected even if the domain matches.
- **EC-A3 — Domain case/format tricks.** `USER@FOLIO3.COM` is allowed (case-insensitive compare). `user@sub.folio3.com`, `user@folio3.com.evil.com`, and `user@notfolio3.com` are all rejected — the check is an exact, case-insensitive match on the full domain, not a substring/endsWith check.
- **EC-A4 — Concurrent first logins.** Two simultaneous first logins for the same account must yield exactly one `users` row (DB unique constraint + upsert; no read-then-insert race).
- **EC-A5 — Google profile changes.** Name/avatar changes on the Google account refresh the profile on next login; email is the stable business identifier alongside the auth id, and role is never touched by re-login.
- **EC-A6 — Employee offboarded.** Google account disabled by Folio3 ⇒ OAuth fails on next login; existing session expires naturally (bounded session lifetime). No in-app deactivation in Phase 1 — documented limitation (PRD A5).
- **EC-A7 — Session expiry mid-action.** Expired session during a mutation returns a friendly re-authentication prompt, not a stack trace; no partial writes.

## Roles & Authorization

- **EC-R1 — Self-promotion attempts.** Direct API/PostgREST calls attempting `UPDATE users SET role='ADMIN'` (own or others' row) are rejected by RLS/column protection regardless of any client behavior (maps to Test 11).
- **EC-R2 — Admin demoted while logged in.** Role is read from the DB per request (or via short-lived claims per architecture); after demotion the next privileged request is denied — stale admin UI must not equal stale admin *authority*.
- **EC-R3 — IDOR probing.** Guessing/iterating task, update, or notification IDs in URLs or API calls never leaks another user's data: not found / denied for unauthorized rows (maps to Test 10).
- **EC-R4 — Member calls admin mutation directly.** Server action / route handler / PostgREST insert on `tasks` by a TEAM_MEMBER fails server-side even though the UI never offers it (maps to Test 12).

## Tasks

- **EC-T1 — Assignee never logged in.** Assignee picker lists provisioned users only (PRD A2); an admin cannot assign to an email with no profile row. Limitation documented in README.
- **EC-T2 — Reassignment mid-flight.** On reassignment the old assignee loses read access (RLS follows `assigned_to`), keeps their historical activity/updates attributed to them; old assignee gets a courtesy notification, new assignee an assignment notification.
- **EC-T3 — Self-assignment by admin.** Admin assigns a task to themselves (D4): allowed; self-triggered notifications suppressed (creator == assignee ⇒ no duplicate/self notification).
- **EC-T4 — Completed then reopened.** Admin moves COMPLETED → IN_PROGRESS: `completed_at` cleared, activity recorded, assignee notified.
- **EC-T5 — Member status transitions.** Member may set only IN_PROGRESS / BLOCKED / COMPLETED on own tasks via progress update (D3); TODO/CANCELLED or transitions on others' tasks are rejected server-side.
- **EC-T6 — Cancelled task interactions.** Progress updates on CANCELLED (and COMPLETED) tasks are rejected with a clear message; task remains readable with full history.
- **EC-T7 — Overdue boundary.** Overdue = `due_date < now()` and status ∉ {COMPLETED, CANCELLED} (PRD A4): a completed-late task is not "overdue"; timestamps stored `timestamptz`, displayed in the viewer's local time.
- **EC-T8 — No due date.** Due date optional? **No — required at creation** (governing prompt lists deadlines as core), but architecture may allow NULL at the schema level only if a story justifies it; Phase 1 UI requires it.
- **EC-T9 — Input extremes.** Title/description length limits enforced (server-side validation + DB constraint); overlong input yields a validation message, not a 500. Rich text is out of scope — plain text rendered escaped (no HTML/script injection).

## Progress Updates

- **EC-P1 — Percentage bounds.** Percent outside 0–100 or non-numeric rejected server-side and constrained in the DB.
- **EC-P2 — Immutability.** No edit/delete path for submitted updates for any role via app surfaces (PRD A3); DB policies deny UPDATE/DELETE.
- **EC-P3 — Update on unassigned task.** Submitting an update for a task not assigned to the caller (crafted request) is denied (RLS insert check on `assigned_to`).
- **EC-P4 — Concurrent update vs reassignment.** If reassignment lands first, the in-flight update from the old assignee is rejected cleanly (assignment checked at write time, not render time).

## Notifications

- **EC-N1 — Self-action suppression.** Actors never receive notifications for their own actions (admin editing own-created task; member updating where they are also creator-admin, EC-T3).
- **EC-N2 — Foreign notification access.** Reading or marking another user's notification (crafted ID) is denied (RLS `recipient = self`), maps to FR31.
- **EC-N3 — Mark-all-read scope.** "Mark all as read" affects only the caller's rows, race-safe if new notifications arrive mid-operation (those stay unread).
- **EC-N4 — Deep-link to inaccessible task.** Notification links to a task later reassigned away: opening marks the notification read and shows a clear "no longer available" state rather than an error page.
- **EC-N5 — Realtime disconnect.** Websocket drop must not strand a stale badge: refetch on reconnect/focus; badge accuracy is eventually consistent within seconds.
- **EC-N6 — Notification storms.** A multi-field admin edit produces **one** consolidated "task updated" notification, not one per field.

## General

- **EC-G1 — Empty everything.** Brand-new user with zero tasks/notifications sees designed empty states on every surface (NFR7).
- **EC-G2 — Network failure mid-mutation.** Failed mutations surface a retryable, friendly error; no optimistic state left inconsistent after failure.
- **EC-G3 — Mobile viewports.** All flows usable at 360×640 and 390×844 without horizontal scroll (Test 13).
- **EC-G4 — Clock skew.** Server timestamps are authoritative; client clocks never determine ordering or overdue state.
