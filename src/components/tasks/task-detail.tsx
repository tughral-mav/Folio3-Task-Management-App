import type { ReactNode } from "react";
import {
  OverdueBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/tasks/badges";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityTimeline } from "@/components/tasks/activity-timeline";
import { UpdatesList } from "@/components/tasks/updates-list";
import { formatDate, formatDateTime, isOverdue } from "@/lib/utils/dates";
import type { TaskDetail } from "@/server/queries/tasks";

type TaskDetailViewProps = {
  task: TaskDetail;
  backHref: string;
  backLabel: string;
  /** Rendered next to the title (e.g. admin Edit button). */
  headerAction?: ReactNode;
  /** Rendered between details and the updates list (e.g. progress form). */
  beforeUpdates?: ReactNode;
};

/**
 * FR15: shared task detail — original task, progress reports, and audit
 * timeline clearly separated. Role differences (edit button, progress form)
 * are injected by the calling page; RLS decides data visibility.
 */
export function TaskDetailView({
  task,
  backHref,
  backLabel,
  headerAction,
  beforeUpdates,
}: TaskDetailViewProps) {
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: backHref, label: backLabel }}
        title={task.title}
        actions={headerAction}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {overdue ? <OverdueBadge /> : null}
          </span>
        }
      />

      <section
        aria-label="Task details"
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Assignee
            </dt>
            <dd className="mt-1 text-zinc-900">
              {task.assignee.full_name || task.assignee.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Created by
            </dt>
            <dd className="mt-1 text-zinc-900">
              {task.creator.full_name || task.creator.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Due date
            </dt>
            <dd
              className={`mt-1 ${overdue ? "font-medium text-red-700" : "text-zinc-900"}`}
            >
              {formatDate(task.due_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Created
            </dt>
            <dd className="mt-1 text-zinc-900">
              {formatDateTime(task.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Last updated
            </dt>
            <dd className="mt-1 text-zinc-900">
              {formatDateTime(task.updated_at)}
            </dd>
          </div>
          {task.completed_at ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Completed
              </dt>
              <dd className="mt-1 text-zinc-900">
                {formatDateTime(task.completed_at)}
              </dd>
            </div>
          ) : null}
        </dl>
        {task.description ? (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
              {task.description}
            </p>
          </div>
        ) : null}
      </section>

      {beforeUpdates}

      <section aria-label="Progress updates">
        <h2 className="text-lg font-semibold text-zinc-900">
          Progress updates
        </h2>
        <div className="mt-4">
          <UpdatesList updates={task.updates} />
        </div>
      </section>

      <section aria-label="Activity">
        <h2 className="text-lg font-semibold text-zinc-900">Activity</h2>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <ActivityTimeline activity={task.activity} />
        </div>
      </section>
    </div>
  );
}
