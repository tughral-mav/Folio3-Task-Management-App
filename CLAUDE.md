@AGENTS.md

# Folio3 Task Management App — project rules

- **Branch policy: ALL work is committed directly to `develop`. NEVER push or merge to `main`** unless the user explicitly asks to promote a release. Vercel production deploys from `develop`.
- **Source of truth:** [docs/requirements/prd.md](docs/requirements/prd.md) (v0.2+). Every change must trace to a PRD epic/story; PRD Change Log is bumped on scope changes. Architecture: [docs/architecture/architecture.md](docs/architecture/architecture.md) (ADR-1…10 are binding).
- **Security invariants (never relax):** Google OAuth only, exact `@folio3.com` domain gate in the DB trigger; RLS on all five tables; no client path can change `users.role`; no DELETE paths; progress updates & activity are immutable; service-role key server-only.
- **Process:** BMAD + agent pipeline (Planning → Architecture → Dev → Test → Review → Deploy) with quality gates; tests must actually run — never claim results.
- Commands: `npm run dev` · `lint` · `typecheck` · `test` · `test:e2e` · local DB via `npx supabase start` / `db reset` (needs Docker; CI runners provide it).
