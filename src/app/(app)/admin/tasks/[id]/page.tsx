import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskDetail } from "@/server/queries/tasks";
import {
  OverdueBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/tasks/badges";
import { ActivityTimeline } from "@/components/tasks/activity-timeline";
import { UpdatesList } from "@/components/tasks/updates-list";
import { formatDate, formatDateTime, isOverdue } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Task" };

// FR15: full task detail — original task, progress reports, and audit
// timeline clearly separated. Admin view (all tasks readable via RLS).
export default async function AdminTaskDetailPage({
  params,
}: PageProps<"/admin/tasks/[id]">) {
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/tasks" className="text-sm text-zinc-500 hover:underline">
          ← Tasks
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{task.title}</h1>
          <Link
            href={`/admin/tasks/${task.id}/edit`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Edit task
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {overdue ? <OverdueBadge /> : null}
        </div>
      </div>

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
            <dd className={`mt-1 ${overdue ? "font-medium text-red-700" : "text-zinc-900"}`}>
              {formatDate(task.due_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Created
            </dt>
            <dd className="mt-1 text-zinc-900">{formatDateTime(task.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Last updated
            </dt>
            <dd className="mt-1 text-zinc-900">{formatDateTime(task.updated_at)}</dd>
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
