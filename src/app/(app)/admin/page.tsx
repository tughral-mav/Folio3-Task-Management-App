import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminStats } from "@/server/queries/dashboard";
import { listTasks } from "@/server/queries/tasks";
import { listRecentActivity } from "@/server/queries/activity";
import { unreadCount } from "@/server/queries/notifications";
import { TaskTable } from "@/components/tasks/task-table";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Admin Dashboard" };

// FR34: stats, recently updated, recent team activity, unread count.
export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();
  const [stats, { tasks: recent }, activity, unread] = await Promise.all([
    getAdminStats(),
    listTasks({ page: 1 }),
    listRecentActivity(10),
    unreadCount(),
  ]);

  const cards = [
    { label: "Total", value: stats.total, href: "/admin/tasks" },
    { label: "To do", value: stats.todo, href: "/admin/tasks?status=TODO" },
    {
      label: "In progress",
      value: stats.inProgress,
      href: "/admin/tasks?status=IN_PROGRESS",
    },
    {
      label: "Blocked",
      value: stats.blocked,
      href: "/admin/tasks?status=BLOCKED",
      alert: stats.blocked > 0,
    },
    {
      label: "Completed",
      value: stats.completed,
      href: "/admin/tasks?status=COMPLETED",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      href: "/admin/tasks",
      alert: stats.overdue > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Welcome, {profile.full_name || profile.email}.
            {unread > 0 ? (
              <>
                {" "}
                <Link href="/notifications" className="text-blue-700 hover:underline">
                  {unread} unread notification{unread === 1 ? "" : "s"}
                </Link>
                .
              </>
            ) : null}
          </p>
        </div>
        <Link
          href="/admin/tasks/new"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          New task
        </Link>
      </div>

      <section aria-label="Task statistics">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className={`block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  c.alert ? "border-red-200" : "border-zinc-200"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {c.label}
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${
                    c.alert ? "text-red-700" : "text-zinc-900"
                  }`}
                >
                  {c.value}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <section aria-label="Recently updated tasks" className="xl:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            Recently updated
          </h2>
          <div className="mt-4">
            <TaskTable
              tasks={recent.slice(0, 5)}
              hrefBase="/admin/tasks"
              emptyMessage="No tasks yet — create the first one."
            />
          </div>
        </section>

        <section aria-label="Recent team activity">
          <h2 className="text-lg font-semibold text-zinc-900">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No activity yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm"
                >
                  {item.task ? (
                    <Link
                      href={`/admin/tasks/${item.task.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {item.task.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-900">Task</span>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {(item.actor
                      ? item.actor.full_name || item.actor.email
                      : "System") +
                      " · " +
                      item.type.replaceAll("_", " ").toLowerCase() +
                      " · " +
                      formatDateTime(item.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
