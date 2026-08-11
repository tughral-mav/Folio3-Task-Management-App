import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin Dashboard" };

// Navigation shell — stat cards, recents, and unread counts land with
// Epic 6 (FR34). Task management (Epic 3) is live below.
export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();

  const links = [
    {
      href: "/admin/tasks",
      title: "Tasks",
      body: "Search, filter, and monitor every task.",
    },
    {
      href: "/admin/tasks/new",
      title: "Create a task",
      body: "Assign new work to a team member.",
    },
    {
      href: "/admin/team",
      title: "Team",
      body: "Everyone who has signed in, with roles.",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Welcome, {profile.full_name || profile.email}.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <h2 className="font-medium text-zinc-900">{l.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{l.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
        Live stats, recent activity, and notifications arrive with Epics 5–6.
      </div>
    </div>
  );
}
