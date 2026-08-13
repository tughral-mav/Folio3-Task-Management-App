import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getDailyActivity } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Insights" };

// FR45: admin daily-activity dashboard — tasks assigned per day, progress
// updates per day, and the daily update counts, over a recent window.
export default async function AdminInsightsPage() {
  await requireAdmin();
  const DAYS = 14;
  const { rows, totals, maxUpdates } = await getDailyActivity(DAYS);

  const tiles = [
    { label: "Updates today", value: totals.updatesToday },
    { label: `Updates · last ${DAYS} days`, value: totals.updates },
    { label: `Tasks assigned · last ${DAYS} days`, value: totals.tasksAssigned },
  ];

  // Chart reads oldest → newest (left → right).
  const chrono = [...rows].reverse();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Daily activity"
        subtitle={`Tasks assigned and progress updates over the last ${DAYS} days.`}
      />

      <section aria-label="Summary">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <li
              key={t.label}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {t.value}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Daily updates chart">
        <h2 className="text-lg font-semibold text-zinc-900">
          Progress updates per day
        </h2>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <div
              className="flex h-48 min-w-140 items-end gap-2"
              role="img"
              aria-label="Bar chart of progress updates per day"
            >
              {chrono.map((r) => {
                const pct = Math.round((r.updates / maxUpdates) * 100);
                return (
                  <div
                    key={r.day}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-xs font-medium text-zinc-600">
                      {r.updates}
                    </span>
                    <div
                      className="w-full rounded-t bg-blue-500"
                      style={{
                        height: `${Math.max(pct, r.updates > 0 ? 6 : 2)}%`,
                      }}
                      title={`${r.label}: ${r.updates} update${r.updates === 1 ? "" : "s"}`}
                    />
                    <span className="w-full truncate text-center text-[10px] text-zinc-400">
                      {r.label.replace(/,.*$/, "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Daily breakdown">
        <h2 className="text-lg font-semibold text-zinc-900">Daily breakdown</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3">Day</th>
                <th scope="col" className="px-4 py-3">Tasks assigned</th>
                <th scope="col" className="px-4 py-3">Progress updates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.day} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-zinc-900">
                    {r.label}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{r.tasksAssigned}</td>
                  <td className="px-4 py-3 text-zinc-700">{r.updates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
