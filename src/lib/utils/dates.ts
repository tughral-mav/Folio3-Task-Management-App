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

/** Consistent date rendering; server timestamps, viewer-local display (EC-T7). */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Local calendar-day key (YYYY-MM-DD) for grouping (FR40). */
export function dayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Time-of-day only, for entries already grouped under a date header. */
export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
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
