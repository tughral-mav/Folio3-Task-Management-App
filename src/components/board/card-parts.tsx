import { formatDate, isOverdue } from "@/lib/utils/dates";
import { PRIORITY_LABELS } from "@/components/tasks/badges";
import type { TaskPriority, TaskStatus } from "@/lib/types/domain";
import type { UserRef } from "@/server/queries/tasks";

/**
 * Trello-style card parts. Priority is shown as a Trello colored "label" bar
 * (using Trello's own label palette), with a text label for accessibility
 * (NFR5 — never color alone).
 */
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "#61bd4f", // Trello green
  MEDIUM: "#f2d600", // Trello yellow
  HIGH: "#ff9f1a", // Trello orange
  URGENT: "#eb5a46", // Trello red
};

export function PriorityLabel({ priority }: { priority: TaskPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-2 w-10 rounded-full"
        style={{ backgroundColor: PRIORITY_COLOR[priority] }}
      />
      <span className="text-[11px] font-medium text-zinc-500">
        {PRIORITY_LABELS[priority]}
      </span>
    </span>
  );
}

export function DueBadge({
  dueDate,
  status,
}: {
  dueDate: string;
  status: TaskStatus;
}) {
  const overdue = isOverdue(dueDate, status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
        overdue ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      <span aria-hidden="true">🕐</span>
      {formatDate(dueDate)}
      {overdue ? <span className="sr-only"> (overdue)</span> : null}
    </span>
  );
}

/**
 * Trello-style card badge row: due date, a description indicator, and a
 * progress-updates ("comments") count. Icons carry text/aria for a11y.
 */
export function CardBadges({
  dueDate,
  status,
  hasDescription,
  updateCount,
}: {
  dueDate: string;
  status: TaskStatus;
  hasDescription: boolean;
  updateCount: number;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
      <DueBadge dueDate={dueDate} status={status} />
      {hasDescription ? (
        <span className="inline-flex items-center gap-0.5" title="Has description">
          <span aria-hidden="true">📝</span>
          <span className="sr-only">Has a description</span>
        </span>
      ) : null}
      {updateCount > 0 ? (
        <span
          className="inline-flex items-center gap-0.5"
          title={`${updateCount} progress update${updateCount === 1 ? "" : "s"}`}
        >
          <span aria-hidden="true">💬</span>
          {updateCount}
          <span className="sr-only">
            progress update{updateCount === 1 ? "" : "s"}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export function AssigneeChip({ user }: { user: UserRef }) {
  const name = user.full_name || user.email;
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#172b4d] text-[10px] font-semibold text-white"
      title={name}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
