# Architecture — Folio3 Task Management App

> **BMAD artifact:** Architect output (pipeline Phase 2).
> **Status:** Not started — Planning (Phase 1) complete; this document is the next deliverable.

## Inputs (binding)

- [PRD v0.2](../requirements/prd.md) — requirements, locked decisions D1–D8, assumptions A1–A8
- [Security requirements](../requirements/security-requirements.md) — SEC-1…SEC-19, RLS matrix
- [Edge cases](../requirements/edge-cases.md) — EC-* catalog
- [Governing prompt](../requirements/initial-prompt.md) — Section 33 defines this document's required contents

## Locked Technical Constraints (already decided — do not revisit)

- Next.js (App Router) + React + TypeScript strict + Tailwind CSS
- Supabase: PostgreSQL, Auth (Google OAuth only, **External** consent screen), Realtime
- Next.js server-side capabilities for backend (no separate server, no microservices)
- Vercel first, VM-portable (`output: 'standalone'`, Dockerfile, no Vercel-proprietary services)
- RLS mandatory on all five tables

## Must Be Designed Here (key open design decisions)

1. **Domain-gate enforcement point** (SEC-3): auth callback check + provisioning trigger vs. Supabase Before-User-Created hook — including guarantee that rejected identities hold no data access.
2. **Role lookup inside RLS without recursion** (SEC-9): SECURITY DEFINER helper vs. server-minted custom claims, and the re-verification rule for privileged mutations.
3. **Member status transitions** (D3/EC-T5): guarded UPDATE policy vs. SECURITY DEFINER RPC.
4. **Notification + activity fan-out**: DB triggers vs. server-action orchestration (atomicity of task-write + activity + notification).
5. Full schema DDL (columns, enums vs lookup tables for extensibility, indexes), Next.js route/module map, state management & data-fetching approach, realtime channel design, validation library and error-shape conventions, testing architecture wiring (local Supabase, session minting for E2E).
