// Domain enums — mirror the Postgres enums in supabase/migrations (ADR-5).
// Generated DB types (lib/types/database.ts) arrive with Story 1.2; these
// narrow domain aliases are the app-facing vocabulary.

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const USER_ROLES = ["TEAM_MEMBER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** D3/EC-T5: the only status targets a member may set via a progress update. */
export const MEMBER_STATUS_TARGETS = [
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
] as const satisfies readonly TaskStatus[];
