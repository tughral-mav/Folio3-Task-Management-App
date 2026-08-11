# Deployment Verification — Governing Prompt Section 39

Checklist executed by the Deployment Agent (Story 7.4). Status as of 2026-08-11.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Production build succeeds | ✅ | `next build` green locally and in CI; Vercel production build READY |
| 2 | Type checking succeeds | ✅ | `npm run typecheck` (`next typegen && tsc --noEmit`) clean, enforced in CI |
| 3 | Linting succeeds | ✅ | `npm run lint` clean, enforced in CI |
| 4 | Unit/integration tests pass | ✅ | 16/16 Vitest tests; CI `quality` job |
| 5 | E2E tests pass | ✅ | Playwright browser suite green in CI — **28/28** on desktop + Pixel 7 (Story 7.2): FR1 login, proxy redirects, admin create/assign (Test 6), member progress (Test 7), notification read/badge (Test 9), admin-area bounce (Test 12), foreign-task IDOR (Test 10), mobile no-overflow (Test 13). Manual real-Google E2E for Tests 1–5 + cross-account 6/7/8 also executed on production. |
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

- iOS Safari (WebKit) mobile spot-check remains manual (the automated mobile project uses Pixel 7 / Chromium emulation).
- Optional hardening noted in code review (#4 fail-closed on absent `email_verified` claim).
- Publishing the Google OAuth app (Testing → In Production) so any `@folio3.com` user can sign in without being an allow-listed test user — a one-click console action for the user; does not affect the domain gate.
