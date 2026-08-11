import type { UserRef } from "@/server/queries/tasks";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types/domain";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/components/tasks/badges";

const FIELD =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";

type TaskFiltersProps = {
  users: UserRef[];
  values: {
    search?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    dueFrom?: string;
    dueTo?: string;
  };
};

/**
 * FR17: combinable search + filters, expressed as URL query params via a
 * plain GET form — server-rendered results, shareable URLs, zero client JS.
 */
export function TaskFilters({ users, values }: TaskFiltersProps) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="min-w-48 flex-1">
        <label htmlFor="f-search" className="block text-xs font-medium text-zinc-600">
          Search
        </label>
        <input
          id="f-search"
          type="search"
          name="q"
          placeholder="Title, description, or person…"
          defaultValue={values.search}
          className={`${FIELD} mt-1 w-full`}
        />
      </div>

      <div>
        <label htmlFor="f-status" className="block text-xs font-medium text-zinc-600">
          Status
        </label>
        <select id="f-status" name="status" defaultValue={values.status ?? ""} className={`${FIELD} mt-1`}>
          <option value="">All</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-priority" className="block text-xs font-medium text-zinc-600">
          Priority
        </label>
        <select id="f-priority" name="priority" defaultValue={values.priority ?? ""} className={`${FIELD} mt-1`}>
          <option value="">All</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-assignee" className="block text-xs font-medium text-zinc-600">
          Assignee
        </label>
        <select id="f-assignee" name="assignee" defaultValue={values.assignee ?? ""} className={`${FIELD} mt-1`}>
          <option value="">Anyone</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-due-from" className="block text-xs font-medium text-zinc-600">
          Due from
        </label>
        <input id="f-due-from" type="date" name="dueFrom" defaultValue={values.dueFrom} className={`${FIELD} mt-1`} />
      </div>

      <div>
        <label htmlFor="f-due-to" className="block text-xs font-medium text-zinc-600">
          Due to
        </label>
        <input id="f-due-to" type="date" name="dueTo" defaultValue={values.dueTo} className={`${FIELD} mt-1`} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Apply
        </button>
        <a
          href="?"
          className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
