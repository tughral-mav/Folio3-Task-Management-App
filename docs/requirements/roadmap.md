# Development Roadmap & Agent Execution Plan

> **BMAD/Planning artifact.** Maps the [PRD epics](prd.md#9-epics-and-user-stories) onto the governing prompt's agent pipeline (Sections 31, 44, 46) and quality gates.

## Agent Pipeline → BMAD Mapping

| Prompt agent | BMAD role | Output |
|---|---|---|
| Planning Agent | Analyst + PM | `docs/requirements/*` (this package) |
| Software Architect Agent | Architect | `docs/architecture/architecture.md`, schema & RLS design |
| Developer Agent | Dev (per sharded story) | Application code, migrations, story-level tests |
| Tester Agent | QA | `docs/testing/*` results, executed suites |
| Code Reviewer Agent | QA/Reviewer | `docs/code-review/*` findings & resolutions |
| Deployment Agent | DevOps | `docs/deployment/*`, live production app |

## Phase Plan

| Phase | Scope | Gate to pass |
|---|---|---|
| **P1 — Planning** ✅ | This requirements package | Requirements complete |
| **P2 — Architecture** | Full technical design: Next.js structure, DB schema + relationships, auth flow (External consent, server-side domain gate), RLS policy definitions, server actions/API map, notification & realtime design, validation, error handling, testing & deployment architecture | Architecture + DB design complete; resolves SEC-3/SEC-9 design choices |
| **P3 — Foundation** | Epic 1 (scaffold, Supabase provisioning [needs user's access token], CI, base schema migration) | App builds; CI green; schema reproducible |
| **P4 — Auth** | Epic 2 (Google sign-in, domain gate, auto-provisioning, role routing) | Tests 1–5 pass (automated layers); manual OAuth check |
| **P5 — Core features** | Epics 3 & 4 (admin task management; member experience & progress) | Tests 6, 7 pass; story-level tests green |
| **P6 — Notifications & dashboards** | Epics 5 & 6 (notification engine, badges, center, realtime; dashboards; responsive/a11y pass) | Tests 8, 9, 13 pass |
| **P7 — Hardening** | Epic 7 stories 7.1–7.3 (adversarial authz/RLS suite, full E2E, code review + fix loops) | Tests 3, 10–12 fail closed; zero CRITICAL/HIGH findings |
| **P8 — Deployment** | Epic 7 story 7.4 (Vercel + production Supabase + OAuth config, verification, full README, VM runbook) | Section 39 checklist green; production verified |
| **P9 — Final report & human approval** | Report per Section 46 Phase 9; Section 45 acceptance checklist walked item by item | Human approval |

Fix loops (Sections 37, 46 P5/P7) run inside P4–P8: failures return to the Developer, are re-tested, then regression-checked before the phase's gate is declared passed.

## Development Conventions

- Work happens on `feature/<epic>.<story>-<slug>` branches off `develop`; merge via PR with CI green.
- Each story is sharded to `docs/stories/<epic>.<story>-<slug>.md` (status: Draft → Approved → In Progress → Review → Done) before its branch is opened.
- The PRD is updated (with Change Log bump) whenever scope shifts; no silent scope drift.

## Human Touchpoints (everything else is autonomous)

1. **P3:** provide Supabase access token (Decision D6).
2. **P4/P8:** create the Google OAuth client (exact click-path will be provided) and paste client ID/secret into Supabase Auth config.
3. **P8:** run the manual OAuth verification script (Folio3 accounts + personal Gmail — D7/D8); connect the GitHub repo to Vercel (or provide a Vercel token).
4. **P9:** final approval.
