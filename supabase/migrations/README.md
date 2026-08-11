# Migrations

All schema changes are reproducible from the migration files in this directory (governing prompt Section 40) — tables, enums, constraints, indexes, RLS enablement, policies, functions and triggers. A fresh Supabase project must reach the full schema via `supabase db reset` / `supabase db push` alone.

Created from Story 1.4 onward. Forward-only; destructive changes require an explicit reviewed migration plan (see [deployment requirements](../../docs/deployment/deployment-requirements.md)).
