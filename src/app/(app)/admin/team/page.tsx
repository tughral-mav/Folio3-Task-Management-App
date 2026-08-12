import type { Metadata } from "next";
import { listUsers } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Team" };

// FR: admins can view team members (auto-provisioned on first sign-in, A2).
export default async function TeamPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Everyone who has signed in at least once. Colleagues appear here automatically after their first Google sign-in."
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google avatar
              <img
                src={u.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full border border-zinc-200"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700"
              >
                {(u.full_name || u.email).charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {u.full_name || u.email}
              </p>
              <p className="truncate text-xs text-zinc-500">{u.email}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {u.role === "ADMIN" ? "Admin" : "Team member"} · joined{" "}
                {formatDate(u.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
