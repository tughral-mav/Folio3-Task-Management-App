import { TaskCard } from "@/components/board/task-card";
import { STATUS_LABELS } from "@/components/tasks/badges";
import type { TaskStatus } from "@/lib/types/domain";
import type { TaskListItem } from "@/server/queries/tasks";

// FR37: the active columns shown on a board (CANCELLED is intentionally not a
// board column — cancelled work lives in the list view).
export const BOARD_COLUMNS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
];

const COLUMN_ACCENT: Record<string, string> = {
  TODO: "before:bg-zinc-400",
  IN_PROGRESS: "before:bg-blue-500",
  BLOCKED: "before:bg-amber-500",
  COMPLETED: "before:bg-emerald-500",
};

export function groupByStatus(
  tasks: TaskListItem[],
): Record<TaskStatus, TaskListItem[]> {
  const groups = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    COMPLETED: [],
    CANCELLED: [],
  } as Record<TaskStatus, TaskListItem[]>;
  for (const t of tasks) groups[t.status].push(t);
  return groups;
}

/**
 * FR37/FR39: read-only Trello-style board (used for the member board and as
 * the visual base). The admin board is a separate interactive client wrapper.
 */
export function Board({
  tasks,
  hrefBase,
}: {
  tasks: TaskListItem[];
  hrefBase: string;
}) {
  const groups = groupByStatus(tasks);
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((status) => (
        <section
          key={status}
          aria-label={STATUS_LABELS[status]}
          className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-100/80 p-3"
        >
          <h2
            className={`relative mb-3 flex items-center justify-between pl-3 text-sm font-semibold text-zinc-700 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full ${COLUMN_ACCENT[status]}`}
          >
            {STATUS_LABELS[status]}
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">
              {groups[status].length}
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {groups[status].length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400">
                No tasks
              </p>
            ) : (
              groups[status].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  href={`${hrefBase}/${task.id}`}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
