# Deployment Requirements — Folio3 Task Management App

> **BMAD/Planning artifact** (executed by the Deployment Agent in P8). Governing prompt Section 39 applies; deployment claims must be verified, never assumed.

## 1. Topology

- **Primary (Phase 1):** Vercel free tier, auto-deploying from GitHub. **Production branch = `develop`** (stakeholder directive 2026-08-11: all work lives on `develop`; `main` is frozen until an explicit release promotion). Region close to the team.
- **Portability requirement (Decision D5):** the app must also run self-hosted on an Azure/AWS VM with **zero code changes**:
  - Next.js `output: 'standalone'`; provided `Dockerfile` builds a runnable image.
  - No Vercel-proprietary services (KV/Blob/Edge Config/Vercel Cron); all state in Supabase.
  - Configuration exclusively via environment variables.
  - A **VM runbook** in `docs/deployment/` covers: build/run (Node or Docker), reverse proxy + TLS (nginx/Caddy), env configuration, and the two host-move updates — Google OAuth redirect URLs and Supabase Auth Site URL/redirect allow-list.
- **Supabase:** one cloud project (free tier) for production, provisioned via CLI (Decision D6); local Docker stack for dev/test. Migrations are the only schema-change mechanism.

## 2. Environment Variables

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Public anon key (safe by design; RLS is the boundary) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Never `NEXT_PUBLIC_`, never client-bundled (SEC-11) |
| `FOLIO3_GOOGLE_DOMAIN` | server | `folio3.com` — the domain gate reads this, no hardcoding |
| `NEXT_PUBLIC_SITE_URL` | client+server | Canonical URL for redirects/links per environment |

`.env.example` holds placeholders; real values only in `.env.local` (gitignored) and platform settings. Google OAuth client ID/secret live in Supabase Auth provider config, not in app env.

## 3. External Configuration (human-assisted)

1. **Google OAuth client** (user creates; exact steps provided at P4): External consent screen, authorized redirect URI = Supabase project callback URL; client ID/secret entered in Supabase Auth → Google provider.
2. **Supabase Auth settings:** Google provider on, all other providers off; Site URL + redirect allow-list for local, Vercel, and (later) VM domains.
3. **Vercel:** GitHub repo connection, env vars, production domain.

## 4. Pre-Deployment Checklist (Section 39 — all verified, none assumed)

- [ ] `next build` production build succeeds
- [ ] Typecheck and lint pass
- [ ] Unit, integration, RLS, and E2E suites pass in CI
- [ ] No unresolved CRITICAL/HIGH code-review findings
- [ ] Secret scan: nothing sensitive committed; service key absent from client bundle (verified by build output inspection)
- [ ] Env vars documented and set in the target platform
- [ ] Migrations applied to production Supabase; schema matches migrations exactly
- [ ] Google OAuth redirect URLs correct for the production domain
- [ ] Supabase Auth Site URL / allow-list correct
- [ ] Post-deploy smoke: real Folio3 login, task create → notify → progress → notify loop, non-Folio3 rejection (manual script, Decisions D7/D8)

## 5. Post-Deployment

- Record production URL, deployed commit SHA, and smoke-test results in `docs/deployment/` as a dated release note.
- Rollback path: redeploy previous Vercel build; database migrations must be forward-only with additive changes preferred (destructive changes require an explicit, reviewed migration plan).
- Cost guardrail: free tiers only in Phase 1; any paid infrastructure requires human approval first.
