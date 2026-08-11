# Architecture — Folio3 Task Management App

> **BMAD artifact:** Architect output. Finalize before Epic 1 development begins.
> **Status:** Not started — pending stack decision (see [PRD Open Questions](prd.md#open-questions)).

## Decisions To Make

- [ ] Frontend framework (e.g. React, Next.js, Angular)
- [ ] Backend framework / language (e.g. Node + NestJS, .NET, Python + FastAPI)
- [ ] Database (e.g. PostgreSQL, SQL Server)
- [ ] Auth approach (session vs JWT; managed provider vs self-rolled)
- [ ] Hosting / deployment target and CI provider

## Constraints from the PRD

- Web app, responsive to tablet width (NFR1)
- <500 ms perceived latency on common interactions (NFR2)
- Hashed passwords, HTTPS everywhere (NFR3)
- Server-side authorization per project membership (NFR4)
- Monorepo, single deployable app + API (Technical Assumptions)
