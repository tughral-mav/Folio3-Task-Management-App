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
          { href: "/admin/insights", label: "Insights" },
          { href: "/admin/team", label: "Team" },
          { href: "/notifications", label: "Notifications" },
        ]
      : [
          { href: "/my", label: "Dashboard" },
          { href: "/my/board", label: "Board" },
          { href: "/my/tasks", label: "My Tasks" },
          { href: "/my/tasks/new", label: "New task" },
          { href: "/my/activity", label: "Activity" },
          { href: "/notifications", label: "Notifications" },
        ];

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip bg-zinc-50">
      {/* NFR5: keyboard users can bypass the header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 bg-[#172b4d] text-white shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            href={home}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white"
          >
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded bg-white/20 text-xs"
            >
              ▦
            </span>
            Folio3 <span className="text-white/70">Tasks</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-white/80 sm:inline">
              {profile.full_name || profile.email}
            </span>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google avatar, tiny
              <img
                src={profile.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full border border-white/30"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-medium text-white"
              >
                {(profile.full_name || profile.email).charAt(0).toUpperCase()}
              </span>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav
          aria-label="Primary"
          className="border-t border-white/10 bg-black/10"
        >
          <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-3 py-1.5 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block rounded-md px-3 py-1.5 font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
