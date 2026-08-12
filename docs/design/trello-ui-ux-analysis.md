# Trello UI/UX Analysis & Application

> **Purpose:** record Trello's UI/UX so our board can faithfully mirror it, and
> track what we applied vs. deliberately skipped (and why).
> **Method note:** the user's board `trello.com/b/khKUeVkZ/my-trello-board` is
> **private** — an unauthenticated Playwright session hits "Sign up to see this
> board" (captured 2026-08-12), and I cannot use the user's credentials or
> complete Atlassian OAuth headlessly. This analysis therefore draws on Trello's
> live public chrome (captured) plus its established, stable design system. To
> mirror the user's exact board, set it Public and it can be re-captured.

## 1. Layout & chrome

- **Top app bar:** slim, dark (`#1D2125` in current Trello), fixed; left = logo + boards/search, right = create, notifications bell, account avatar. Persistent across the app.
- **Board header:** below the app bar, over the board background — board title (inline-editable), star, visibility, board members as overlapping avatars, filter, and a "…" menu opening a right sidebar.
- **Board surface:** a full-bleed colored/photo **background**; lists sit directly on it, horizontally scrollable.

## 2. Lists (columns)

- Fixed width (~272px), translucent light-gray (`#EBECF0` / newer `#F1F2F4`), rounded (~12px), small drop shadow.
- **Header:** bold list title (inline-editable) + a small **card-count**; a "…" list-actions menu.
- **Footer:** a persistent **"+ Add a card"** affordance.
- Lists are drag-reorderable; cards drag within/between lists.

## 3. Cards

- White, rounded (~8px), subtle shadow (`0 1px 1px rgba(9,30,66,.25)`), tight padding; hover raises the shadow; a pencil **quick-edit** appears on hover.
- **Label chips:** small colored bars/pills at the top (Trello's label palette: green `#61BD4F`, yellow `#F2D600`, orange `#FF9F1A`, red `#EB5A46`, purple, blue…).
- **Title:** dark ink `#172B4D`, ~14px.
- **Badge row (bottom):** compact icon+count badges — **due date** (clock; turns red when overdue, green when complete), **description** present (☰/📝 icon), **comments** count (💬 N), **checklist** progress (☑ 2/5), attachments, and **member avatars** (small circles) right-aligned.
- Clicking a card opens it in a **modal overlay** (not a full navigation) over a dimmed board.

## 4. Card detail (modal)

- Large modal: title, list/status context, a **description** editor, **labels**, **members**, **due date**, **checklists**, **attachments**, an **activity/comments** feed at the bottom with a comment composer. Right-hand action sidebar (add members, labels, dates, move, etc.).

## 5. Interactions

- **Drag-and-drop** everywhere (cards, lists) with placeholder gaps.
- **Inline composers:** add-card and add-list are inline textareas, not modal forms; Enter adds and keeps the composer open to add the next.
- **Quick edit** on a card (pencil) for title/labels/due without opening the modal.
- **Filtering** by member/label/due; **board menu** sidebar for settings/activity.
- Optimistic updates; instant feel.

## 6. Visual tokens

| Token | Value |
|---|---|
| Ink | `#172B4D` |
| Board blue (classic) | gradient `#0079BF → #026AA7` |
| List gray | `#EBECF0` |
| Card shadow | `0 1px 1px rgba(9,30,66,.25)` |
| Label green/yellow/orange/red | `#61BD4F` / `#F2D600` / `#FF9F1A` / `#EB5A46` |
| Radius | list ~12px, card ~8px |
| Font | system stack (-apple-system / Segoe UI / Roboto) |

## 7. Application to our app

**Already applied (prior commit):** full-bleed blue board, navy top bar, gray lists with status dot + count, white cards with a colored **priority label bar**, clock **due badge** (red when overdue), **assignee avatar** chip, drag-and-drop + accessible status control (admin), read-only member board.

**Applied in this pass:**

- **Card badge row** matching Trello: description indicator (📝), **updates/comments count** (💬 N) sourced from `task_updates`, alongside the due badge and assignee avatar.
- **Inline "Add a card" composer** at the bottom of each admin column (Trello's signature quick-add): an inline title field + compact assignee/due, creating a task **in that column's status** via `quickCreateTaskAction`; the composer stays open to add another. Empty columns show the same affordance.

**Deliberately not applied (with reasons):**

- **Card detail as a modal overlay** — our task detail is a full server-rendered page with progress/activity; a modal is a larger rework with marginal benefit and some a11y/routing risk. Deferred; noted as a future enhancement.
- **Inline-editable board/list titles, list reordering, add/remove lists** — our columns are the fixed task **statuses** (by design/security model), not user-defined lists, so renaming/adding lists doesn't apply.
- **Labels beyond priority, checklists, attachments, power-ups, butler automation, board backgrounds gallery, starring/board-switching** — out of scope for the task model / Phase 1; several conflict with the security model or add no task-management value.
- **Member status drag on the member board** — members change status only via progress updates (decision D3), so their board stays read-only by design.

## 8. Fidelity check (Playwright)

Every applied change is screenshot-verified on the running app (desktop + mobile) with Playwright before commit, and the functional E2E suite (`board.spec`, `dated-progress.spec`) is kept green.
