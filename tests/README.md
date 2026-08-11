# Tests

Test suites per the [test strategy](../docs/testing/test-strategy.md):

- `unit/` — Vitest, pure logic
- `integration/` — Vitest against local Supabase (RLS on)
- `rls/` — authorization/RLS suite executing as forged identities (anon, member A, member B, admin)
- `e2e/` — Playwright journeys, desktop + mobile viewports, session-injection auth

Populated from Epic 1 onward; layout may be refined by the architecture (colocated unit tests are acceptable — this directory is authoritative for integration/RLS/E2E).
