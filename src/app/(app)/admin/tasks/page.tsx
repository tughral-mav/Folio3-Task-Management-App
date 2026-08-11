import type { Metadata } from "next";
import Link from "next/link";
import { listTasks, listUsers } from "@/server/queries/tasks";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types/domain";

export const metadata: Metadata = { title: "Tasks" };

function first(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// FR17: global admin task list with combinable search/filters (URL-driven).
export default async function AdminTasksPage({
  searchParams,
}: PageProps<"/admin/tasks">) {
  const params = await searchParams;

  const status = first(params.status);
  const priority = first(params.priority);
  const pageParam = Number(first(params.page) ?? "1");

  const filters = {
    search: first(params.q),
    status: TASK_STATUSES.includes(status as TaskStatus)
      ? (status as TaskStatus)
      : undefined,
    priority: TASK_PRIORITIES.includes(priority as TaskPriority)
      ? (priority as TaskPriority)
      : undefined,
    assignee: first(params.assignee),
    dueFrom: first(params.dueFrom),
    dueTo: first(params.dueTo),
    page: Number.isFinite(pageParam) ? pageParam : 1,
  };

  const [{ tasks, count, page, pageCount }, users] = await Promise.all([
    listTasks(filters),
    listUsers(),
  ]);

  const pageLink = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const val = first(v as string | string[] | undefined);
      if (val && k !== "page") qs.set(k, val);
    }
    qs.set("page", String(p));
    return `?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {count} task{count === 1 ? "" : "s"} across the team.
          </p>
        </div>
        <Link
          href="/admin/tasks/new"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          New task
        </Link>
      </div>

      <TaskFilters
        users={users}
        values={{
          search: filters.search,
          status: filters.status,
          priority: filters.priority,
          assignee: filters.assignee,
          dueFrom: filters.dueFrom,
          dueTo: filters.dueTo,
        }}
      />

      <TaskTable
        tasks={tasks}
        hrefBase="/admin/tasks"
        emptyMessage="No tasks match these filters."
      />

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-2 text-sm">
          {page > 1 ? (
            <Link href={pageLink(page - 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50">
              Previous
            </Link>
          ) : null}
          <span className="text-zinc-600">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageLink(page + 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50">
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
