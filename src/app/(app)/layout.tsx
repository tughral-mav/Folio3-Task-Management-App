import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { signOutAction } from "@/server/actions/auth";
import { NotificationBell } from "@/components/notifications/bell";
import { RealtimeRefresher } from "@/components/notifications/realtime-refresher";

/**
 * Authenticated shell (FR5/FR6). requireUser() re-checks the session and
 * DB profile on every request; RLS enforces underneath regardless.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireUser();
  const home = profile.role === "ADMIN" ? "/admin" : "/my";

  const nav =
    profile.role === "ADMIN"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/board", label: "Board" },
          { href: "/admin/tasks", label: "Tasks" },
          { href: "/admin/team", label: "Team" },
          { href: "/notifications", label: "Notifications" },
        ]
      : [
          { href: "/my", label: "Dashboard" },
          { href: "/my/board", label: "Board" },
          { href: "/my/tasks", label: "My Tasks" },
          { href: "/my/activity", label: "Activity" },
          { href: "/notifications", label: "Notifications" },
        ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      {/* NFR5: keyboard users can bypass the header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            href={home}
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            Folio3 <span className="text-blue-600">Task Manager</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-zinc-600 sm:inline">
              {profile.full_name || profile.email}
            </span>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google avatar, tiny
              <img
                src={profile.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full border border-zinc-200"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700"
              >
                {(profile.full_name || profile.email).charAt(0).toUpperCase()}
              </span>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav
          aria-label="Primary"
          className="mx-auto w-full max-w-6xl overflow-x-auto px-4"
        >
          <ul className="flex gap-1 pb-2 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block rounded-lg px-3 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <RealtimeRefresher userId={profile.id} />
    </div>
  );
}
