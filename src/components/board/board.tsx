import { TaskCard } from "@/components/board/task-card";
import { STATUS_LABELS } from "@/components/tasks/badges";
import type { TaskStatus } from "@/lib/types/domain";
import type { BoardTask } from "@/server/queries/tasks";

// FR37: the active columns shown on a board (CANCELLED is intentionally not a
// board column — cancelled work lives in the list view).
export const BOARD_COLUMNS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
];

const COLUMN_ACCENT: Record<string, string> = {
  TODO: "bg-zinc-400",
  IN_PROGRESS: "bg-blue-500",
  BLOCKED: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
};

export function groupByStatus(
  tasks: BoardTask[],
): Record<TaskStatus, BoardTask[]> {
  const groups = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    COMPLETED: [],
    CANCELLED: [],
  } as Record<TaskStatus, BoardTask[]>;
  for (const t of tasks) groups[t.status].push(t);
  return groups;
}

/** Shared Trello list column header (title + count + accent). */
export function ColumnHeader({
  status,
  count,
}: {
  status: TaskStatus;
  count: number;
}) {
  return (
    <h2 className="mb-2 flex items-center justify-between px-1 py-1 text-sm font-semibold text-[#172b4d]">
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${COLUMN_ACCENT[status]}`}
        />
        {STATUS_LABELS[status]}
      </span>
      <span className="rounded bg-black/10 px-1.5 text-xs font-medium text-[#172b4d]/70">
        {count}
      </span>
    </h2>
  );
}

/**
 * FR37/FR39: read-only Trello-style board (member board + visual base). The
 * admin board is a separate interactive client wrapper.
 */
export function Board({
  tasks,
  hrefBase,
}: {
  tasks: BoardTask[];
  hrefBase: string;
}) {
  const groups = groupByStatus(tasks);
  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((status) => (
        <section
          key={status}
          aria-label={STATUS_LABELS[status]}
          className="trello-list flex w-72 shrink-0 flex-col rounded-xl p-2 shadow-sm"
        >
          <ColumnHeader status={status} count={groups[status].length} />
          <div className="flex flex-col gap-2">
            {groups[status].length === 0 ? (
              <p className="rounded-lg px-2 py-3 text-center text-xs text-zinc-400">
                No cards
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
