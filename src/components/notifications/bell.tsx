import Link from "next/link";
import { unreadCount } from "@/server/queries/notifications";

/**
 * FR29: global unread badge — server-rendered; kept live by the
 * RealtimeRefresher (router.refresh on notification events + focus).
 * Hidden at zero; count announced to screen readers via the label.
 */
export async function NotificationBell() {
  const count = await unreadCount();
  const display = count > 99 ? "99+" : String(count);

  return (
    <Link
      href="/notifications"
      aria-label={
        count === 0
          ? "Notifications"
          : `Notifications, ${count} unread`
      }
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span aria-hidden="true">🔔</span>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white"
        >
          {display}
        </span>
      ) : null}
    </Link>
  );
}
