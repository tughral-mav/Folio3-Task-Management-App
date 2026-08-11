# Folio3 Task Management App

A task management application built by Folio3, developed using the **BMAD Method** (Breakthrough Method for Agile AI-Driven Development).

## How this project is run

This project follows the BMAD two-phase workflow:

1. **Planning phase** — produces the core documents in [docs/](docs/):
   - [Project Brief](docs/project-brief.md) — problem statement, target users, goals (Analyst output)
   - [PRD](docs/prd.md) — the **source of truth** for requirements, epics, and stories (PM output). All development work must trace back to this document, and it is kept up to date as scope evolves.
   - [Architecture](docs/architecture.md) — technical design and stack decisions (Architect output)
2. **Development phase** — the PRD's epics are sharded into individual stories under [docs/stories/](docs/stories/). Each story is implemented on a feature branch, reviewed, and merged into `develop`.

## Branching model

| Branch | Purpose |
|---|---|
| `main` | Stable, release-ready code only |
| `develop` | Integration branch — all feature work merges here |
| `feature/<epic>-<story>` | One branch per story, branched from `develop` |

## Status

Planning phase — PRD v0.1 drafted, awaiting stakeholder review and refinement.
