import type { Metadata } from "next";
import Link from "next/link";
import { listBoardTasks, listUsers } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { BoardShell } from "@/components/board/board-shell";
import { AdminBoard } from "@/components/board/admin-board";

export const metadata: Metadata = { title: "Board" };

const HEADER_BTN =
  "rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// FR37/FR38: the Trello-style board is the admin's primary task surface.
export default async function AdminBoardPage() {
  const [tasks, users] = await Promise.all([listBoardTasks(), listUsers()]);

  return (
    <BoardShell>
      <PageHeader
        onDark
        title="Board"
        subtitle="Drag a card between columns — or use its status menu — to change its status."
        actions={
          <>
            <Link href="/admin/tasks" className={HEADER_BTN}>
              List view
            </Link>
            <Link href="/admin/tasks/new" className={HEADER_BTN}>
              New task
            </Link>
          </>
        }
      />
      <AdminBoard tasks={tasks} users={users} />
    </BoardShell>
  );
}
