import Link from "next/link";
import {
  OverdueBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/tasks/badges";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import type { TaskListItem } from "@/server/queries/tasks";

type TaskTableProps = {
  tasks: TaskListItem[];
  /** Base path for detail links, e.g. /admin/tasks or /my/tasks. */
  hrefBase: string;
  emptyMessage: string;
};

/**
 * NFR1: real table on desktop, card list on mobile — not a shrunk table.
 * Overdue highlighting per FR36/EC-T7.
 */
export function TaskTable({ tasks, hrefBase, emptyMessage }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {tasks.map((t) => {
          const overdue = isOverdue(t.due_date, t.status);
          return (
            <li key={t.id}>
              <Link
                href={`${hrefBase}/${t.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition active:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-zinc-900">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <PriorityBadge priority={t.priority} />
                  {overdue ? <OverdueBadge /> : null}
                  <span>Due {formatDate(t.due_date)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.assignee.full_name || t.assignee.email}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th scope="col" className="px-4 py-3">Task</th>
              <th scope="col" className="px-4 py-3">Assignee</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Priority</th>
              <th scope="col" className="px-4 py-3">Due</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tasks.map((t) => {
              const overdue = isOverdue(t.due_date, t.status);
              return (
                <tr key={t.id} className="transition hover:bg-zinc-50">
                  <td className="max-w-80 px-4 py-3">
                    <Link
                      href={`${hrefBase}/${t.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {t.assignee.full_name || t.assignee.email}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                    <span className={overdue ? "font-medium text-red-700" : ""}>
                      {formatDate(t.due_date)}
                    </span>
                    {overdue ? (
                      <span className="ml-2">
                        <OverdueBadge />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                    {formatDate(t.updated_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
