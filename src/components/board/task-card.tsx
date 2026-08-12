import Link from "next/link";
import { OverdueBadge, PriorityBadge } from "@/components/tasks/badges";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import type { TaskListItem } from "@/server/queries/tasks";

/**
 * FR37: a Trello-style task card. Presentational only — the interactive admin
 * board wraps this with drag handlers and a status control.
 */
export function TaskCard({
  task,
  href,
}: {
  task: TaskListItem;
  href: string;
}) {
  const overdue = isOverdue(task.due_date, task.status);
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <p className="text-sm font-medium text-zinc-900">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {overdue ? <OverdueBadge /> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="truncate">
          {task.assignee.full_name || task.assignee.email}
        </span>
        <span className="whitespace-nowrap">Due {formatDate(task.due_date)}</span>
      </div>
    </Link>
  );
}
