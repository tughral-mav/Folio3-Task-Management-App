import type { TaskStatus } from "@/lib/types/domain";

/**
 * FR36 / EC-T7: a task is overdue iff its due date is in the past and it is
 * not COMPLETED or CANCELLED. Server timestamps are authoritative (EC-G4);
 * callers pass `now` explicitly in tests.
 */
export function isOverdue(
  dueDate: string | Date,
  status: TaskStatus,
  now: Date = new Date(),
): boolean {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

/** Due within the next `hours` (and not overdue/closed) — "needs attention" (FR35). */
export function isDueSoon(
  dueDate: string | Date,
  status: TaskStatus,
  now: Date = new Date(),
  hours = 48,
): boolean {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return false;
  const diff = due.getTime() - now.getTime();
  return diff >= 0 && diff <= hours * 60 * 60 * 1000;
}
