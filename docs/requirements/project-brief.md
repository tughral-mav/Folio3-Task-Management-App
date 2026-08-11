# Project Brief — Folio3 Task Management App

> **BMAD artifact:** Analyst output. Feeds the [PRD](prd.md).
> **Status:** v1.0 — aligned with the governing [initial requirements prompt](initial-prompt.md).

## Problem Statement

Folio3 teams coordinate assigned work across chat threads, spreadsheets, and email. Admins lack a single view of who is doing what, by when, and what is blocked; team members lack a single place to see their assignments and report progress.

## Proposed Solution

An **internal-only** task management web application. Administrators create, assign, and monitor tasks (priority, deadline, status); team members view their assigned work and submit progress updates; persisted in-app notifications with live unread badges keep both sides informed. Access is exclusively via Folio3 Google accounts (`@folio3.com`) — no signup, no passwords.

## Target Users

- **Folio3 administrators / leads (ADMIN):** create and assign tasks, monitor progress, read updates.
- **Folio3 employees (TEAM_MEMBER):** work assigned tasks, report progress, track their own history. All users auto-provision on first Google login as TEAM_MEMBER; admins are promoted directly in the database (Phase 1).

## Goals

- Single source of truth for assigned work, visible to the right people only.
- Progress flows to the assigning admin automatically (notifications, activity timeline).
- Zero account administration overhead; security enforced server-side and at the database (RLS).
- Real production system on Supabase + Next.js, deployable to Vercel today and a VM later.

## Out of Scope (Phase 1)

Role-management UI, projects/workspaces, Kanban, email/push notifications, attachments, time tracking, reporting/exports, directory sync, localization, native mobile apps.

## Key Constraints

- Google OAuth only; External consent screen — the `@folio3.com` gate is enforced entirely server-side.
- Supabase RLS mandatory on all tables; frontend hiding is never the security boundary.
- Cost-effective: free tiers (Vercel, Supabase) suffice at expected internal scale.
