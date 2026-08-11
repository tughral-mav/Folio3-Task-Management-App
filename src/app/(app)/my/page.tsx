import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listOpenTasks, listTasks } from "@/server/queries/tasks";
import { TaskTable } from "@/components/tasks/task-table";
import { isDueSoon, isOverdue } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "My Tasks" };

/**
 * FR35: member dashboard — needs-attention section (overdue / blocked / due
 * soon) computed over ALL open tasks (Finding #2), plus recently-updated
 * tasks. RLS scopes everything to the caller.
 */
export default async function MemberDashboardPage() {
  const { profile } = await requireUser();
  const [open, { tasks }] = await Promise.all([
    listOpenTasks(),
    listTasks({ page: 1 }),
  ]);

  const attention = open.filter(
    (t) =>
      t.status === "BLOCKED" ||
      isOverdue(t.due_date, t.status) ||
      isDueSoon(t.due_date, t.status),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Welcome, {profile.full_name || profile.email}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {open.length} open task{open.length === 1 ? "" : "s"} assigned to
            you.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/my/tasks"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            All my tasks
          </Link>
          <Link
            href="/my/activity"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            My activity
          </Link>
        </div>
      </div>

      {attention.length > 0 ? (
        <section aria-label="Needs attention">
          <h2 className="text-lg font-semibold text-amber-800">
            Needs attention
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Overdue, blocked, or due within 48 hours.
          </p>
          <div className="mt-4">
            <TaskTable
              tasks={attention}
              hrefBase="/my/tasks"
              emptyMessage=""
            />
          </div>
        </section>
      ) : null}

      <section aria-label="Recent tasks">
        <h2 className="text-lg font-semibold text-zinc-900">Recent tasks</h2>
        <div className="mt-4">
          <TaskTable
            tasks={tasks.slice(0, 10)}
            hrefBase="/my/tasks"
            emptyMessage="No tasks assigned to you yet."
          />
        </div>
      </section>
    </div>
  );
}
