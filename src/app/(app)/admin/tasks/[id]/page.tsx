import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskDetail } from "@/server/queries/tasks";
import { TaskDetailView } from "@/components/tasks/task-detail";

export const metadata: Metadata = { title: "Task" };

// FR15 admin view: all tasks readable via RLS; edit entry point in header.
export default async function AdminTaskDetailPage({
  params,
}: PageProps<"/admin/tasks/[id]">) {
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  return (
    <TaskDetailView
      task={task}
      backHref="/admin/tasks"
      backLabel="Tasks"
      headerAction={
        <Link
          href={`/admin/tasks/${task.id}/edit`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Edit task
        </Link>
      }
    />
  );
}
