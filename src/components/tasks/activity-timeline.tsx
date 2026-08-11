import { formatDateTime } from "@/lib/utils/dates";
import { STATUS_LABELS } from "@/components/tasks/badges";
import type { TaskDetail } from "@/server/queries/tasks";
import type { TaskStatus } from "@/lib/types/domain";

type ActivityItem = TaskDetail["activity"][number];

function statusLabel(value: unknown): string {
  return typeof value === "string" && value in STATUS_LABELS
    ? STATUS_LABELS[value as TaskStatus]
    : String(value ?? "");
}

/** FR15: human-readable line for each audit event (system events included). */
function describe(item: ActivityItem): string {
  const who = item.actor ? item.actor.full_name || item.actor.email : "System";
  const d = (item.detail ?? {}) as Record<string, unknown>;
  switch (item.type) {
    case "TASK_CREATED":
      return `${who} created the task`;
    case "TASK_REASSIGNED":
      return `${who} reassigned the task`;
    case "TASK_UPDATED": {
      const changed = Array.isArray(d.changed) ? d.changed.join(", ") : "details";
      return `${who} updated ${changed}`;
    }
    case "STATUS_CHANGED":
      return `${who} changed status from ${statusLabel(d.from)} to ${statusLabel(d.to)}`;
    case "PROGRESS_SUBMITTED":
      return d.percent != null
        ? `${who} submitted a progress update (${String(d.percent)}%)`
        : `${who} submitted a progress update`;
    case "TASK_COMPLETED":
      return `${who} marked the task completed`;
    case "TASK_CANCELLED":
      return `${who} cancelled the task`;
    default:
      return `${who} updated the task`;
  }
}

// FR15/FR25: append-only audit timeline, clearly separated from content.
export function ActivityTimeline({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-zinc-500">No activity recorded yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {activity.map((item) => (
        <li key={item.id} className="flex gap-3 text-sm">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-300"
          />
          <div>
            <p className="text-zinc-800">{describe(item)}</p>
            <p className="text-xs text-zinc-500">
              {formatDateTime(item.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
