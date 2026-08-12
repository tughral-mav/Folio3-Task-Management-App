import { dayKey, formatDate, formatTime } from "@/lib/utils/dates";
import { STATUS_LABELS } from "@/components/tasks/badges";
import type { TaskDetail } from "@/server/queries/tasks";

type UpdateItem = TaskDetail["updates"][number];

/**
 * FR15/FR22/FR40: progress reports grouped by calendar date (newest day
 * first, newest update first within a day) so an admin can read a member's
 * progress history by date. Rendered as escaped plain text (SEC-15);
 * immutable — no edit controls exist anywhere (A3).
 */
export function UpdatesList({ updates }: { updates: UpdateItem[] }) {
  if (updates.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No progress updates have been submitted yet.
      </p>
    );
  }

  // `updates` arrives newest-first (query orders created_at desc).
  const groups: { key: string; label: string; items: UpdateItem[] }[] = [];
  for (const u of updates) {
    const key = dayKey(u.created_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(u);
    } else {
      groups.push({ key, label: formatDate(u.created_at), items: [u] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-label={`Updates on ${group.label}`}>
          <h3 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>{group.label}</span>
            <span className="h-px flex-1 bg-zinc-200" aria-hidden="true" />
            <span className="font-normal normal-case text-zinc-400">
              {group.items.length} update{group.items.length === 1 ? "" : "s"}
            </span>
          </h3>
          <ul className="space-y-3">
            {group.items.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-800">
                    {u.author.full_name || u.author.email}
                  </span>
                  <span>{formatTime(u.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
                  {u.body}
                </p>
                {(u.percent != null || u.new_status) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                    {u.percent != null ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium">{u.percent}%</span>
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200"
                        >
                          <span
                            className="block h-full rounded-full bg-blue-600"
                            style={{ width: `${u.percent}%` }}
                          />
                        </span>
                      </span>
                    ) : null}
                    {u.new_status ? (
                      <span>Status set to {STATUS_LABELS[u.new_status]}</span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
