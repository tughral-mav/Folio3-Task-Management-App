import type { Metadata } from "next";
import Link from "next/link";
import { listBoardTasks } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { BoardShell } from "@/components/board/board-shell";
import { Board } from "@/components/board/board";

export const metadata: Metadata = { title: "My Board" };

// FR39: read-only board of the member's own tasks (RLS-scoped). Members change
// status by opening a card and submitting a progress update (D3), so the
// member board is not drag-interactive.
export default async function MemberBoardPage() {
  const tasks = await listBoardTasks();

  return (
    <BoardShell>
      <PageHeader
        onDark
        title="My Board"
        subtitle="Your tasks by status. Open a card to report progress."
        actions={
          <Link
            href="/my/tasks"
            className="rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            List view
          </Link>
        }
      />
      {tasks.length === 0 ? (
        <div className="rounded-xl bg-white/90 p-10 text-center text-sm text-zinc-500">
          No tasks assigned to you yet.
        </div>
      ) : (
        <Board tasks={tasks} hrefBase="/my/tasks" />
      )}
    </BoardShell>
  );
}
