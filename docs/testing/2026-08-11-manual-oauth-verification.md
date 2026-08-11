# Manual OAuth Verification — 2026-08-11 (local dev against production Supabase)

Performed by the human (tughralhussain@folio3.com) per the [test strategy §2/§3](test-strategy.md) manual layer; DB state independently verified by the Tester via management-API queries.

| Mandated test | Manual portion | Result |
|---|---|---|
| 1 — Valid Folio3 login | Real Google login, first ever | ✅ PASS — authenticated, allowed in |
| 4 — New user creation | Same login | ✅ PASS — exactly one `users` row auto-created, role `TEAM_MEMBER`, full name synced; member dashboard shown |
| 2 — Existing user login | Retry after first-attempt hiccup | ✅ PASS — no duplicate row (auth_users=1, profiles=1), role preserved |
| 5 — Admin login | Operator SQL promotion (`role='ADMIN'`), page refresh | ✅ PASS — Admin Dashboard rendered without re-login (per-request DB role read, EC-R2) |
| 3 — Non-Folio3 login | Personal Gmail attempt | ✅ PASS — Access Denied; DB verified clean: 0 non-folio3 rows in `auth.users` (transaction-abort gate leaves no trace) |
| 6 — Admin creates & assigns task | Real cross-account run on production | ✅ PASS — task "Sojao" assigned to huzaifamusharraf@folio3.com; DB-verified: TASK_CREATED activity + TASK_ASSIGNED notification to the member; self-assigned task produced zero notifications (EC-N1 self-suppression) |
| 1/4 — New user provisioning (2nd account) | huzaifamusharraf@folio3.com first login | ✅ PASS — auto-created as TEAM_MEMBER, name synced, exactly one row, no duplicate |
| 7/8 — Progress + task-update loop | Member reports progress; admin edits task | ✅ PASS — confirmed by the user on production (live badge + view updates) |

Additional live observations:

- Task creation as admin worked (tasks=1, activity=1: `TASK_CREATED`).
- **Self-action suppression verified in production**: self-assigned task produced 0 notifications (EC-N1/EC-T3).
- Known anomaly: the very first login attempt failed at the app's code-for-session exchange (`/access-denied?reason=denied`) and succeeded on retry; auth user + profile were created correctly on the first attempt. Transient PKCE exchange failure; server-side logging added (commit bd58363). Watch for recurrence.
