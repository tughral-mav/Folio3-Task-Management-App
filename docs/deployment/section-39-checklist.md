# Deployment Verification — Governing Prompt Section 39

Checklist executed by the Deployment Agent (Story 7.4). Status as of 2026-08-11.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Production build succeeds | ✅ | `next build` green locally and in CI; Vercel production build READY |
| 2 | Type checking succeeds | ✅ | `npm run typecheck` (`next typegen && tsc --noEmit`) clean, enforced in CI |
| 3 | Linting succeeds | ✅ | `npm run lint` clean, enforced in CI |
| 4 | Unit/integration tests pass | ✅ | 16/16 Vitest tests; CI `quality` job |
| 5 | E2E tests pass | ⚠️ Partial | RLS/authorization suite (Tests 3, 10–12 layer) green in CI; Playwright browser E2E is scaffolded (config + projects) but full journey specs are a documented follow-up (Story 7.2). Manual E2E for Tests 1–5 executed against production Supabase (docs/testing/2026-08-11-manual-oauth-verification.md); Tests 6–8 deferred to production cross-account run. |
| 6 | RLS tests pass | ✅ | `npm run test:rls` — adversarial suite green in CI `schema` job against real Postgres |
| 7 | No CRITICAL/HIGH code-review issues | ✅ | Independent review PASS, 0 CRITICAL/0 HIGH; MEDIUM + actionable LOW fixed (docs/code-review/2026-08-11-full-implementation.md) |
| 8 | Secrets not committed | ✅ | `.env*` gitignored except `.env.example` (placeholders); no service-role client in `src/`; service key only in server env |
| 9 | Env vars documented | ✅ | README + `.env.example` + deployment-requirements.md; 5 vars set in Vercel (production + preview) |
| 10 | Database migrations exist & reproducible | ✅ | 8 migrations; CI `schema` job rebuilds from scratch + verifies; `supabase db push` applied all to cloud |
| 11 | Production Supabase config correct | ✅ | Project `acioywfrjbalyqbavmoy` (ap-south-1); migrations applied; Google provider enabled, email/phone/anonymous disabled |
| 12 | Google OAuth config correct | ✅ | Web client, redirect URI = `https://acioywfrjbalyqbavmoy.supabase.co/auth/v1/callback`; verified by real logins |
| 13 | Redirect URLs correct | ✅ | Supabase Site URL = production URL; allow-list = production + localhost `/auth/callback` |
| 14 | Production domain configured | ✅ | https://folio3-task-management-app.vercel.app (Vercel alias); production branch = `develop`; git auto-deploy confirmed |
| 15 | Application works after deployment | ✅ | Smoke tests: unauthenticated `/` → 307 → `/login` (proxy guard); `/login` renders Google button + domain notice; manual real Folio3 login → Admin Dashboard |

## Cost

Free tiers only: Vercel Hobby, Supabase Free, Google OAuth (no verification/billing). No paid infrastructure introduced.

## Outstanding (non-blocking, documented)

- Playwright browser-journey specs (Story 7.2) — the harness/config exists; writing the full Test 6–13 browser flows is the remaining test work. Their security-critical assertions (Tests 3, 10–12) are already covered by the RLS suite; Tests 1–5 are covered by executed manual verification.
- Cross-account manual loop (Tests 6–8) on production with a second `@folio3.com` account (user's lead) — deferred by the user.
- Optional hardening noted in code review (#4 fail-closed on absent `email_verified` claim).
