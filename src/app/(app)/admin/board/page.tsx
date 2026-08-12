import type { Metadata } from "next";
import Link from "next/link";
import { listBoardTasks } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { AdminBoard } from "@/components/board/admin-board";

export const metadata: Metadata = { title: "Board" };

// FR37/FR38: the Trello-style board is the admin's primary task surface.
export default async function AdminBoardPage() {
  const tasks = await listBoardTasks();

  return (
    <div>
      <PageHeader
        title="Board"
        subtitle="Drag a card between columns — or use its status menu — to change its status."
        actions={
          <>
            <Link
              href="/admin/tasks"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              List view
            </Link>
            <Link
              href="/admin/tasks/new"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              New task
            </Link>
          </>
        }
      />
      <AdminBoard tasks={tasks} />
    </div>
  );
}
