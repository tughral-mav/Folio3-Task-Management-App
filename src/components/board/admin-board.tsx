"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  moveTaskStatusAction,
  quickCreateTaskAction,
  type TaskFormState,
} from "@/server/actions/tasks";
import {
  BOARD_COLUMNS,
  ColumnHeader,
  groupByStatus,
} from "@/components/board/board";
import {
  AssigneeChip,
  CardBadges,
  PriorityLabel,
} from "@/components/board/card-parts";
import { STATUS_LABELS } from "@/components/tasks/badges";
import type { TaskStatus } from "@/lib/types/domain";
import type { BoardTask, UserRef } from "@/server/queries/tasks";

/**
 * FR38: interactive admin board. Cards move between columns by drag-and-drop
 * or the per-card status <select> (keyboard-accessible — NFR5); a Trello-style
 * inline composer adds a card straight into a column. All writes go through
 * admin-only server actions; RLS re-enforces admin-only.
 */
export function AdminBoard({
  tasks,
  users,
}: {
  tasks: BoardTask[];
  users: UserRef[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync local state when the server component refreshes with new data
  // (React's "adjust state during render on prop change" pattern).
  const [seenTasks, setSeenTasks] = useState(tasks);
  if (seenTasks !== tasks) {
    setSeenTasks(tasks);
    setItems(tasks);
  }

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
        setItems(previous);
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
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
            className={`flex max-h-[calc(100vh-11rem)] w-72 shrink-0 flex-col rounded-xl p-2 shadow-sm transition-colors ${
              dropCol === status ? "bg-blue-100" : "trello-list"
            }`}
          >
            <ColumnHeader status={status} count={groups[status].length} />

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {groups[status].map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`trello-card-shadow cursor-grab rounded-lg bg-white p-2.5 active:cursor-grabbing ${
                    dragId === task.id ? "opacity-50" : ""
                  }`}
                >
                  <PriorityLabel priority={task.priority} />
                  <Link
                    href={`/admin/tasks/${task.id}`}
                    className="mt-1.5 block text-sm font-medium text-[#172b4d] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    {task.title}
                  </Link>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <CardBadges
                      dueDate={task.due_date}
                      status={task.status}
                      hasDescription={Boolean(task.description?.trim())}
                      updateCount={task.updateCount}
                    />
                    <AssigneeChip user={task.assignee} />
                  </div>
                  <label className="mt-2 block">
                    <span className="sr-only">Move “{task.title}” to status</span>
                    <select
                      aria-label={`Status of ${task.title}`}
                      value={task.status}
                      onChange={(e) =>
                        move(task.id, e.target.value as TaskStatus)
                      }
                      className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                    >
                      {BOARD_COLUMNS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>

            <AddCardComposer status={status} users={users} />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Trello-style inline "Add a card" composer for one column. */
function AddCardComposer({
  status,
  users,
}: {
  status: TaskStatus;
  users: UserRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = quickCreateTaskAction.bind(null, status);
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm text-[#172b4d]/70 transition hover:bg-black/10 hover:text-[#172b4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span aria-hidden="true">＋</span> Add a card
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-2 rounded-lg bg-white p-2 shadow-sm"
      // Re-open composer after a successful add so several can be added.
      key={state?.ok ? "reset" : "editing"}
    >
      <label className="sr-only" htmlFor={`add-title-${status}`}>
        Card title
      </label>
      <textarea
        id={`add-title-${status}`}
        name="title"
        rows={2}
        required
        autoFocus
        placeholder="Enter a title for this card…"
        className="w-full resize-none rounded border border-zinc-200 px-2 py-1.5 text-sm text-[#172b4d] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
      />
      <div className="mt-2 grid grid-cols-1 gap-2">
        <label className="sr-only" htmlFor={`add-assignee-${status}`}>
          Assignee
        </label>
        <select
          id={`add-assignee-${status}`}
          name="assigned_to"
          required
          defaultValue=""
          className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        >
          <option value="" disabled>
            Assignee…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`add-due-${status}`}>
          Due date
        </label>
        <input
          id={`add-due-${status}`}
          name="due_date"
          type="date"
          required
          className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error.message}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add card"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1.5 text-sm text-zinc-500 transition hover:text-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
