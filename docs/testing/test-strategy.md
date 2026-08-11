# Test Strategy — Folio3 Task Management App

> **BMAD/Planning artifact** (refined by the Tester Agent during P4–P7). Governing prompt Sections 35–37 apply: tests must be **actually executed** — never claimed. Test results land in `docs/testing/` as dated reports.

## 1. Layers

| Layer | Tooling | Scope | Runs in CI |
|---|---|---|---|
| Unit | Vitest | Pure logic: validation schemas, permission helpers, overdue calculation, notification recipient resolution | ✅ every PR |
| Integration | Vitest + local Supabase (`supabase start`) | Server actions / route handlers against a real Postgres with RLS on: provisioning upsert, task CRUD, progress submission, notification creation | ✅ every PR |
| RLS / authorization | SQL-level tests executing queries as forged JWT identities (anon, member A, member B, admin) against local Supabase | Every policy in the [security matrix](../requirements/security-requirements.md#sec-8): positive + negative cases, IDOR probes, role self-change, append-only enforcement | ✅ every PR |
| E2E | Playwright | Full user journeys in a real browser against a seeded local stack, desktop + mobile viewports | ✅ on PRs to `develop`/`main` |
| Manual verification | Human + script | Real Google OAuth handshake paths that cannot be automated (see §3) | Before production sign-off |

## 2. The OAuth Automation Boundary (honesty contract)

Google blocks scripted logins, so the **real** Google handshake is tested manually; everything after the handshake is automated by injecting authenticated Supabase sessions for seeded test users. Reports must label each of the 13 mandated tests with the layer it actually ran at:

- **Automated (session-injection / API / RLS):** everything below except the true handshake.
- **Manual (human, scripted steps):** real logins for Tests 1–5's handshake portion and Test 3's real-Gmail rejection (Decisions D7, D8).

## 3. The 13 Mandated E2E Tests → Execution Plan

| # | Test | Automated coverage | Manual portion |
|---|---|---|---|
| 1 | Valid Folio3 login | Callback/provisioning logic with simulated verified Folio3 identity; role default asserted in DB | Real login with @folio3.com account |
| 2 | Existing user login | Repeat-provisioning idempotency (no duplicate row, role preserved) | Real second login |
| 3 | Non-Folio3 login | Rejection path with simulated gmail identity: signed out, no profile row, zero data via crafted session | Real login with personal Gmail → ACCESS DENIED |
| 4 | New user creation | First-login upsert, TEAM_MEMBER default, member dashboard routing | Real first login with second Folio3 account |
| 5 | Admin login | Role flip in DB → admin dashboard + admin surfaces render and authorize | Real login after SQL promotion |
| 6 | Admin creates task | Playwright: form → DB row, activity row, assignee notification, member dashboard visibility | — |
| 7 | Member submits progress | Playwright: update stored, admin sees it, activity + creator notification | — |
| 8 | Task update propagation | Playwright: admin edit → member view updates (realtime/refetch), notification + badge | — |
| 9 | Notification read state | Playwright: badge appears → open → read → count decrements → zero hides badge | — |
| 10 | Unauthorized task access (IDOR) | Playwright (UI) + API/RLS layer: member A requests member B's task by ID → denied both paths | — |
| 11 | Privilege escalation | API/RLS layer: role UPDATE attempts via every write surface → denied | — |
| 12 | Admin-only action as member | API/RLS layer + Playwright: task create/assign as member → denied server-side | — |
| 13 | Mobile | Playwright mobile viewports (360×640, 390×844): all §36 checks incl. no horizontal overflow, touch targets | Spot-check on a real phone (optional) |

## 4. Additional Required Suites

- **Edge-case suite:** every EC-* item in [edge-cases.md](../requirements/edge-cases.md) maps to at least one automated test or a documented manual step (EC-A4 race, EC-N3 mark-all-read race, EC-T5 illegal transitions, EC-P1 bounds, etc.).
- **Regression:** full CI suite reruns on every fix-loop iteration; a fixed bug gets a pinned regression test.
- **Responsive/a11y checks:** Playwright viewport matrix + keyboard-only walkthrough + automated a11y scan (axe) on key pages; findings triaged like functional bugs.

## 5. Environments & Data

- CI and local testing run against **local Supabase** (Docker) rebuilt from migrations each run (`supabase db reset`) with deterministic seed data (2 members, 1 admin, representative tasks/notifications). Production credentials never appear in tests.
- E2E auth uses pre-provisioned seeded users with sessions minted via server-side helpers — no real Google traffic in CI.

## 6. Exit Criteria (feeds quality gates)

All CI layers green; the 13 mandated tests pass at their automated layers; manual verification script executed by the human with recorded results; zero known CRITICAL/HIGH defects; edge-case suite green. Only then does the pipeline proceed to code review → deployment (Sections 37–39).
