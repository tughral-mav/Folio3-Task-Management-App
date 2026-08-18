"use client";

import { useActionState } from "react";
import type { TaskFormState } from "@/server/actions/tasks";
import type { UserRef } from "@/server/queries/tasks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types/domain";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/components/tasks/badges";
import { UserCombobox } from "@/components/tasks/user-combobox";

type TaskFormProps = {
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  users: UserRef[];
  submitLabel: string;
  /** Present in edit mode only (FR13) — admins may set any status. */
  withStatus?: boolean;
  defaults?: {
    title?: string;
    description?: string;
    assigned_to?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    due_date?: string; // YYYY-MM-DD
  };
};

const FIELD =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";
const LABEL = "block text-sm font-medium text-zinc-800";
const ERROR = "mt-1 text-sm text-red-700";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={ERROR}>
      {message}
    </p>
  );
}

// FR10/FR13: validated create/edit form. Server-side validation is
// authoritative; native required/maxLength attributes are UX only.
export function TaskForm({
  action,
  users,
  submitLabel,
  withStatus = false,
  defaults = {},
}: TaskFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state && !state.ok ? (state.error.fields ?? {}) : {};

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {state && !state.ok ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="task-title" className={LABEL}>
          Title
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={defaults.title}
          className={FIELD}
        />
        <FieldError message={errors.title} />
      </div>

      <div>
        <label htmlFor="task-description" className={LABEL}>
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          rows={5}
          maxLength={10000}
          defaultValue={defaults.description}
          className={FIELD}
        />
        <FieldError message={errors.description} />
      </div>

      <div>
        <label htmlFor="task-assignee" className={LABEL}>
          Assignee
        </label>
        <UserCombobox
          inputId="task-assignee"
          name="assigned_to"
          users={users}
          defaultValue={defaults.assigned_to}
          placeholder="Search team members…"
        />
        <FieldError message={errors.assigned_to} />
        {users.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">
            No team members yet — a colleague appears here after their first
            sign-in.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="task-priority" className={LABEL}>
            Priority
          </label>
          <select
            id="task-priority"
            name="priority"
            required
            defaultValue={defaults.priority ?? "MEDIUM"}
            className={FIELD}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <FieldError message={errors.priority} />
        </div>

        <div>
          <label htmlFor="task-due-date" className={LABEL}>
            Due date
          </label>
          <input
            id="task-due-date"
            name="due_date"
            type="date"
            required
            defaultValue={defaults.due_date}
            className={FIELD}
          />
          <FieldError message={errors.due_date} />
        </div>
      </div>

      {withStatus ? (
        <div>
          <label htmlFor="task-status" className={LABEL}>
            Status
          </label>
          <select
            id="task-status"
            name="status"
            required
            defaultValue={defaults.status ?? "TODO"}
            className={FIELD}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <FieldError message={errors.status} />
        </div>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
