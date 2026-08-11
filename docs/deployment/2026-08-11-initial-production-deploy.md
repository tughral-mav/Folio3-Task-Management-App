# Release Note — Initial Production Deployment (2026-08-11)

- **Production URL:** https://folio3-task-management-app.vercel.app
- **Platform:** Vercel (team `tkay-s-projects`, project `folio3-task-management-app`, plan Hobby), region iad1 build
- **Git integration:** GitHub repo connected; **production branch = `develop`** (stakeholder directive) — set via API before first auto-deploy
- **Deployed commit:** working tree at `bd58363` + deploy fixes (committed immediately after as the next develop commit)
- **Env:** 5 vars set for production+preview (Supabase URL/anon/service-role [server-only], FOLIO3_GOOGLE_DOMAIN, NEXT_PUBLIC_SITE_URL)
- **Supabase Auth:** site_url → production URL; allow-list = production + localhost callbacks; Google provider unchanged (its redirect URI is the Supabase domain, host-independent)
- **Deploy fix:** `output: 'standalone'` breaks Vercel's serverless packaging (missing `.nft.json` traces) — now conditional: standalone everywhere except `VERCEL=1` (NFR9/D5 portability preserved for Docker/VM)
- **Smoke test (executed):** `GET /login` → 200 with "Continue with Google"; unauthenticated `GET /` → 307 → `/login` (proxy guard live)
- **Outstanding before final acceptance:** Story 7.1–7.3 (adversarial suite, E2E, code review), full Section 39 checklist run, manual Tests 6–8 cross-account loop on production (user + lead account), Section 42 full README

This is an interim deployment to enable the deferred cross-account manual verification; the formal Deployment Agent checklist run happens at Story 7.4.
