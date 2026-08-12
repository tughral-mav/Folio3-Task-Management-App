import type { Metadata } from "next";
import Link from "next/link";
import { listBoardTasks } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { Board } from "@/components/board/board";

export const metadata: Metadata = { title: "My Board" };

// FR39: read-only board of the member's own tasks (RLS-scoped). Members change
// status by opening a card and submitting a progress update (D3), so the
// member board is not drag-interactive.
export default async function MemberBoardPage() {
  const tasks = await listBoardTasks();

  return (
    <div>
      <PageHeader
        title="My Board"
        subtitle="Your tasks by status. Open a card to report progress."
        actions={
          <Link
            href="/my/tasks"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            List view
          </Link>
        }
      />
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          No tasks assigned to you yet.
        </div>
      ) : (
        <Board tasks={tasks} hrefBase="/my/tasks" />
      )}
    </div>
  );
}
