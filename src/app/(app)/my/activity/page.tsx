import type { Metadata } from "next";
import Link from "next/link";
import { listRecentActivity } from "@/server/queries/activity";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "My Activity" };

// Story 4.4 / FR25: recent history on the member's own tasks (RLS-scoped).
export default async function MyActivityPage() {
  const activity = await listRecentActivity(50);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Activity"
        subtitle="Recent events on tasks assigned to you."
      />
      {activity.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          No activity yet — it appears here once tasks are assigned to you.
        </div>
      ) : (
        <ol className="space-y-3">
          {activity.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {item.task ? (
                  <Link
                    href={`/my/tasks/${item.task.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {item.task.title}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900">Task</span>
                )}
                <span className="text-xs text-zinc-500">
                  {formatDateTime(item.created_at)}
                </span>
              </div>
              <p className="mt-1 text-zinc-600">
                {(item.actor ? item.actor.full_name || item.actor.email : "System") +
                  " · " +
                  item.type.replaceAll("_", " ").toLowerCase()}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
