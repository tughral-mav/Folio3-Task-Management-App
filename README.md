# Folio3 Task Management App

An **internal** task management web application for Folio3 employees. Administrators create and assign tasks; team members work them and report progress; persisted in-app notifications keep everyone current. Access is exclusively via Folio3 Google accounts (`@folio3.com`) — **no signup, no passwords**.

> **Status: Planning complete (Phase 1). Architecture (Phase 2) is next.** This README will be expanded into the full setup/operations guide (per [requirements Section 42](docs/requirements/initial-prompt.md)) as implementation lands.

## Key Facts

- **Auth:** Google OAuth via Supabase Auth. Only verified `@folio3.com` accounts are admitted; first-time users are auto-provisioned as `TEAM_MEMBER`. There is no signup flow and no password login.
- **Roles:** `ADMIN` and `TEAM_MEMBER`. New users always default to `TEAM_MEMBER`; admins are promoted **directly in the database** in Phase 1 (a role-management UI is intentionally deferred).
- **Security:** authorization enforced server-side **and** with Supabase Row Level Security — the frontend is never the security boundary.
- **Stack:** Next.js (App Router) + TypeScript + Tailwind · Supabase (PostgreSQL, Auth, Realtime) · Vercel (portable to a self-hosted VM: standalone build + Dockerfile, no Vercel-proprietary services).

## Development Process (BMAD × agent pipeline)

Planning → Architecture → Development → Testing → Code Review → Deployment, with enforced quality gates and fix loops. See the [roadmap](docs/requirements/roadmap.md).

| Document | Purpose |
|---|---|
| [docs/requirements/initial-prompt.md](docs/requirements/initial-prompt.md) | Governing requirements (verbatim) |
| [docs/requirements/prd.md](docs/requirements/prd.md) | **PRD — source of truth** (requirements, decisions, epics & stories) |
| [docs/requirements/project-brief.md](docs/requirements/project-brief.md) | Problem, users, goals |
| [docs/requirements/edge-cases.md](docs/requirements/edge-cases.md) · [security-requirements.md](docs/requirements/security-requirements.md) | Edge-case catalog · binding security model |
| [docs/architecture/architecture.md](docs/architecture/architecture.md) | Technical design (Phase 2) |
| [docs/testing/test-strategy.md](docs/testing/test-strategy.md) | Test layers, the 13 mandated E2E tests, OAuth automation boundary |
| [docs/deployment/deployment-requirements.md](docs/deployment/deployment-requirements.md) | Hosting, env vars, checklists, VM portability |
| [docs/stories/](docs/stories/) | Sharded stories (BMAD development phase) |
| [docs/code-review/](docs/code-review/) | Review reports |

## Repository Layout

```
docs/{requirements,architecture,testing,deployment,code-review,stories}
supabase/migrations     # reproducible schema (from Story 1.4)
tests/                  # unit / integration / rls / e2e (from Epic 1)
.env.example            # configuration placeholders — never commit real secrets
```

## Branching

| Branch | Purpose |
|---|---|
| `main` | Stable, release-ready |
| `develop` | Integration — all work merges here via PR with green CI |
| `feature/<epic>.<story>-<slug>` | One branch per story, off `develop` |
