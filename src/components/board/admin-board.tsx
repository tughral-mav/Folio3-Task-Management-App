"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveTaskStatusAction } from "@/server/actions/tasks";
import { BOARD_COLUMNS, groupByStatus } from "@/components/board/board";
import {
  OverdueBadge,
  PriorityBadge,
  STATUS_LABELS,
} from "@/components/tasks/badges";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import type { TaskStatus } from "@/lib/types/domain";
import type { TaskListItem } from "@/server/queries/tasks";

const COLUMN_ACCENT: Record<string, string> = {
  TODO: "before:bg-zinc-400",
  IN_PROGRESS: "before:bg-blue-500",
  BLOCKED: "before:bg-amber-500",
  COMPLETED: "before:bg-emerald-500",
};

/**
 * FR38: interactive admin board. Cards move between columns by drag-and-drop
 * or by the per-card status <select> (keyboard-accessible — NFR5). Both call
 * the admin-only moveTaskStatusAction; the UI updates optimistically and
 * reverts on failure. RLS still enforces admin-only on the server.
 */
export function AdminBoard({ tasks }: { tasks: TaskListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const groups = groupByStatus(items);

  function move(taskId: string, status: TaskStatus) {
    const current = items.find((t) => t.id === taskId);
    if (!current || current.status === status) return;

    const previous = items;
    setItems((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    setError(null);

    startTransition(async () => {
      const result = await moveTaskStatusAction(taskId, status);
      if (!result.ok) {
        setItems(previous); // revert
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => (
          <section
            key={status}
            aria-label={STATUS_LABELS[status]}
            onDragOver={(e) => {
              e.preventDefault();
              setDropCol(status);
            }}
            onDragLeave={() => setDropCol((c) => (c === status ? null : c))}
            onDrop={() => {
              if (dragId) move(dragId, status);
              setDragId(null);
              setDropCol(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl p-3 transition-colors ${
              dropCol === status ? "bg-blue-100/70" : "bg-zinc-100/80"
            }`}
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
                groups[status].map((task) => {
                  const overdue = isOverdue(task.due_date, task.status);
                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow"
                    >
                      <Link
                        href={`/admin/tasks/${task.id}`}
                        className="block text-sm font-medium text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PriorityBadge priority={task.priority} />
                        {overdue ? <OverdueBadge /> : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
                        <span className="truncate">
                          {task.assignee.full_name || task.assignee.email}
                        </span>
                        <span className="whitespace-nowrap">
                          {formatDate(task.due_date)}
                        </span>
                      </div>
                      <label className="mt-2 block">
                        <span className="sr-only">
                          Move “{task.title}” to status
                        </span>
                        <select
                          aria-label={`Status of ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            move(task.id, e.target.value as TaskStatus)
                          }
                          className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        >
                          {BOARD_COLUMNS.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
