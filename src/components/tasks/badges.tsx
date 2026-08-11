import type { TaskPriority, TaskStatus } from "@/lib/types/domain";

/**
 * NFR5: status/priority always communicate via symbol + label + color —
 * never color alone.
 */

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<TaskStatus, { cls: string; symbol: string }> = {
  TODO: { cls: "bg-zinc-100 text-zinc-700 border-zinc-200", symbol: "○" },
  IN_PROGRESS: { cls: "bg-blue-50 text-blue-700 border-blue-200", symbol: "◐" },
  BLOCKED: { cls: "bg-amber-50 text-amber-800 border-amber-200", symbol: "⏸" },
  COMPLETED: {
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    symbol: "✓",
  },
  CANCELLED: { cls: "bg-zinc-100 text-zinc-500 border-zinc-200", symbol: "✕" },
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_STYLES: Record<TaskPriority, { cls: string; symbol: string }> = {
  LOW: { cls: "bg-zinc-100 text-zinc-600 border-zinc-200", symbol: "▁" },
  MEDIUM: { cls: "bg-sky-50 text-sky-700 border-sky-200", symbol: "▂" },
  HIGH: { cls: "bg-orange-50 text-orange-700 border-orange-200", symbol: "▄" },
  URGENT: { cls: "bg-red-50 text-red-700 border-red-200", symbol: "▆" },
};

const BASE =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`${BASE} ${s.cls}`}>
      <span aria-hidden="true">{s.symbol}</span>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const p = PRIORITY_STYLES[priority];
  return (
    <span className={`${BASE} ${p.cls}`}>
      <span aria-hidden="true">{p.symbol}</span>
      {PRIORITY_LABELS[priority]} priority
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className={`${BASE} border-red-200 bg-red-50 text-red-700`}>
      <span aria-hidden="true">!</span>
      Overdue
    </span>
  );
}
