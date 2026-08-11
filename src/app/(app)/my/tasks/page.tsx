import type { Metadata } from "next";
import { listTasks } from "@/server/queries/tasks";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types/domain";

export const metadata: Metadata = { title: "My Tasks" };

function first(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * FR14/FR18: the member task list. No explicit "mine" filter exists in code —
 * RLS scopes the query to tasks assigned to the caller, so this page cannot
 * leak anything even if its filters were tampered with.
 */
export default async function MyTasksPage({
  searchParams,
}: PageProps<"/my/tasks">) {
  const params = await searchParams;

  const status = first(params.status);
  const priority = first(params.priority);
  const pageParam = Number(first(params.page) ?? "1");

  const filters = {
    status: TASK_STATUSES.includes(status as TaskStatus)
      ? (status as TaskStatus)
      : undefined,
    priority: TASK_PRIORITIES.includes(priority as TaskPriority)
      ? (priority as TaskPriority)
      : undefined,
    dueFrom: first(params.dueFrom),
    dueTo: first(params.dueTo),
    page: Number.isFinite(pageParam) ? pageParam : 1,
  };

  const { tasks, count } = await listTasks(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">My Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {count} task{count === 1 ? "" : "s"} assigned to you.
        </p>
      </div>

      <TaskFilters
        values={{
          status: filters.status,
          priority: filters.priority,
          dueFrom: filters.dueFrom,
          dueTo: filters.dueTo,
        }}
      />

      <TaskTable
        tasks={tasks}
        hrefBase="/my/tasks"
        emptyMessage="No tasks assigned to you yet."
      />
    </div>
  );
}
