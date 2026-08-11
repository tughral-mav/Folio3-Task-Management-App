import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTaskDetail } from "@/server/queries/tasks";
import { submitProgressAction } from "@/server/actions/progress";
import { TaskDetailView } from "@/components/tasks/task-detail";
import { ProgressForm } from "@/components/tasks/progress-form";

export const metadata: Metadata = { title: "Task" };

/**
 * FR15 member view. RLS returns null for tasks not assigned to the caller —
 * a foreign task ID 404s here (Test 10, UI layer). No admin controls render.
 * EC-T6: the progress form is replaced by a notice on closed tasks (the RPC
 * enforces the same rule server-side regardless).
 */
export default async function MyTaskDetailPage({
  params,
}: PageProps<"/my/tasks/[id]">) {
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";
  const boundAction = submitProgressAction.bind(null, task.id);

  return (
    <TaskDetailView
      task={task}
      backHref="/my/tasks"
      backLabel="My Tasks"
      beforeUpdates={
        closed ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            This task is {task.status === "COMPLETED" ? "completed" : "cancelled"}
            — progress can no longer be reported.
          </p>
        ) : (
          <ProgressForm action={boundAction} />
        )
      }
    />
  );
}
