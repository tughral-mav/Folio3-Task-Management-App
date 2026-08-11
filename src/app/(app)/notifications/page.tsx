import type { Metadata } from "next";
import { listNotifications } from "@/server/queries/notifications";
import {
  markAllReadAction,
  openNotificationAction,
} from "@/server/actions/notifications";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Notifications" };

// FR30: the notification center — unread distinction, open → navigate +
// mark read, mark all read. Own rows only (RLS, FR31).
export default async function NotificationsPage() {
  const notifications = await listNotifications();
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
        {hasUnread ? (
          <form action={markAllReadAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          You&apos;re all caught up.
        </div>
      ) : (
        <ol className="space-y-2">
          {notifications.map((n) => {
            const unread = !n.read_at;
            const open = openNotificationAction.bind(null, n.id);
            return (
              <li key={n.id}>
                <form action={open}>
                  <button
                    type="submit"
                    className={`w-full rounded-xl border p-4 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      unread
                        ? "border-blue-200 bg-blue-50/60 hover:bg-blue-50"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex items-start gap-2.5">
                        {unread ? (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent"
                          />
                        )}
                        <span>
                          <span
                            className={`block text-sm ${unread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"}`}
                          >
                            {n.title}
                            {unread ? (
                              <span className="sr-only"> (unread)</span>
                            ) : null}
                          </span>
                          {n.message ? (
                            <span className="mt-0.5 block text-sm text-zinc-600">
                              {n.message}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatDateTime(n.created_at)}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
