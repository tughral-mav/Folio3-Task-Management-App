import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTaskDetail } from "@/server/queries/tasks";
import { submitProgressAction } from "@/server/actions/progress";
import { TaskDetailView } from "@/components/tasks/task-detail";
import { ProgressForm } from "@/components/tasks/progress-form";

export const metadata: Metadata = { title: "Task" };

/**
 * FR15/FR43 member view. RLS returns the task only if the caller is its
 * assignee or creator (else 404 — Test 10, UI layer). The progress form shows
 * only to the **assignee** (the RPC enforces assignee-only anyway); a creator
 * who isn't the assignee sees the read-only detail + full history.
 */
export default async function MyTaskDetailPage({
  params,
}: PageProps<"/my/tasks/[id]">) {
  const { id } = await params;
  const { profile } = await requireUser();
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const isAssignee = task.assigned_to === profile.id;
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";
  const boundAction = submitProgressAction.bind(null, task.id);

  let progressSlot = null;
  if (isAssignee && closed) {
    progressSlot = (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        This task is {task.status === "COMPLETED" ? "completed" : "cancelled"} —
        progress can no longer be reported.
      </p>
    );
  } else if (isAssignee) {
    progressSlot = <ProgressForm action={boundAction} />;
  } else {
    // Creator/observer view.
    progressSlot = (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        You created this task. Its assignee reports progress below.
      </p>
    );
  }

  return (
    <TaskDetailView
      task={task}
      backHref="/my/tasks"
      backLabel="My Tasks"
      beforeUpdates={progressSlot}
    />
  );
}
