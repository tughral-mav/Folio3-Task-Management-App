# Product Requirements Document — Folio3 Task Management App

> **BMAD artifact:** PM output. This is the **source of truth** for all development work.
> Every story implemented must trace back to a requirement or epic in this document.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-11 | 0.1 | Initial draft — goals, requirements, epic list | Claude (PM) |

## Goals and Background Context

### Goals

- Give teams a single place to capture, assign, and track tasks across projects.
- Make ownership, status, and deadlines visible at a glance.
- Keep the experience low-friction: first task created within minutes of signup.

### Background Context

See [project-brief.md](project-brief.md). Teams coordinate work across scattered tools, losing track of ownership and deadlines. This app centralizes task tracking with projects, assignments, statuses, and boards.

## Requirements

### Functional Requirements

- **FR1:** Users can register, log in, and log out with email and password.
- **FR2:** Users can create, rename, archive, and delete projects.
- **FR3:** Users can invite other users to a project as members.
- **FR4:** Users can create tasks within a project with a title, description, due date, and priority (Low / Medium / High).
- **FR5:** Users can assign a task to a project member.
- **FR6:** Tasks move through statuses: `To Do → In Progress → Done` (plus `Blocked` from any active state).
- **FR7:** Users can view a project's tasks as a Kanban board (columns by status) and as a list (sortable by due date, priority, assignee).
- **FR8:** Users can comment on tasks.
- **FR9:** Users see a personal "My Tasks" view aggregating their assigned tasks across projects.
- **FR10:** Users receive in-app notifications when a task is assigned to them or commented on.

### Non-Functional Requirements

- **NFR1:** Web application, responsive down to tablet width.
- **NFR2:** Common interactions (open board, create/update task) complete in under 500 ms perceived latency.
- **NFR3:** Passwords stored hashed (bcrypt or better); all traffic over HTTPS.
- **NFR4:** A project member can only see projects they belong to (authorization enforced server-side).
- **NFR5:** Automated tests cover core task lifecycle flows.

## UI Design Goals

- Clean, minimal interface; the Kanban board is the home surface of a project.
- Drag-and-drop for status changes on the board.
- Instant feedback (optimistic UI) for task edits.

## Technical Assumptions

> To be finalized in [architecture.md](architecture.md) before Epic 1 development begins.

- **Repository:** Monorepo, single deployable web app + API.
- **Stack:** _TBD — pending architecture decision._
- **Testing:** Unit + integration tests required per story; E2E for critical flows.
- **Branching:** `main` (stable) ← `develop` (integration) ← `feature/*` (per story).

## Epic List

| Epic | Title | Goal |
|---|---|---|
| 1 | Foundation & Authentication | Project scaffold, CI, user registration/login (FR1) |
| 2 | Projects & Membership | Project CRUD and member invitations (FR2, FR3) |
| 3 | Task Management Core | Task CRUD, assignment, statuses (FR4–FR6) |
| 4 | Views — Board, List, My Tasks | Kanban board, list view, personal aggregate view (FR7, FR9) |
| 5 | Collaboration | Comments and in-app notifications (FR8, FR10) |

## Epic Details

### Epic 1 — Foundation & Authentication

**Goal:** A deployable skeleton app with CI and working authentication.

- **Story 1.1:** As a developer, I have a scaffolded project with linting, tests, and CI, so every later story lands on solid ground.
  - AC: repo builds and tests pass in CI on `develop`.
- **Story 1.2:** As a visitor, I can register with email and password, so I can get an account.
  - AC: validation errors surfaced; password hashed at rest (NFR3).
- **Story 1.3:** As a registered user, I can log in and log out, so my session is secure.
  - AC: invalid credentials rejected; session persists across refresh.

### Epic 2 — Projects & Membership

**Goal:** Users can organize work into projects and bring teammates in.

- **Story 2.1:** As a user, I can create, rename, archive, and delete a project.
- **Story 2.2:** As a project owner, I can invite registered users to my project.
- **Story 2.3:** As a member, I only see projects I belong to (NFR4).

### Epic 3 — Task Management Core

**Goal:** The full task lifecycle inside a project.

- **Story 3.1:** As a member, I can create a task with title, description, due date, and priority.
- **Story 3.2:** As a member, I can assign a task to any project member.
- **Story 3.3:** As a member, I can move a task through To Do / In Progress / Done / Blocked.
- **Story 3.4:** As a member, I can edit and delete tasks.

### Epic 4 — Views: Board, List, My Tasks

**Goal:** Visibility — see work the way that suits the moment.

- **Story 4.1:** As a member, I can view a project as a Kanban board with drag-and-drop status changes.
- **Story 4.2:** As a member, I can view tasks as a sortable list (due date, priority, assignee).
- **Story 4.3:** As a user, I can see all my assigned tasks across projects in one "My Tasks" view.

### Epic 5 — Collaboration

**Goal:** Conversation and awareness where the work is.

- **Story 5.1:** As a member, I can comment on a task.
- **Story 5.2:** As a user, I get an in-app notification when I'm assigned a task or my task receives a comment.

## Open Questions

- [ ] Tech stack decision (blocks Epic 1) — see [architecture.md](architecture.md).
- [ ] Are email notifications needed for v1, or in-app only (FR10)?
- [ ] Should task priority affect board ordering automatically?
