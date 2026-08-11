import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTaskAction } from "@/server/actions/tasks";
import { getTaskDetail, listUsers } from "@/server/queries/tasks";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "Edit task" };

// FR13: admin edits any field, any status, reassignment included. Fan-out
// (consolidated notification, activity diff) is trigger-side (ADR-4/8).
export default async function EditTaskPage({
  params,
}: PageProps<"/admin/tasks/[id]/edit">) {
  const { id } = await params;
  const [task, users] = await Promise.all([getTaskDetail(id), listUsers()]);
  if (!task) notFound();

  const boundAction = updateTaskAction.bind(null, task.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/tasks/${task.id}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← {task.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Edit task</h1>
        <p className="mt-1 text-sm text-zinc-600">
          The assignee (and the task creator, if someone else) are notified of
          the change.
        </p>
      </div>
      <TaskForm
        action={boundAction}
        users={users}
        submitLabel="Save changes"
        withStatus
        defaults={{
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          priority: task.priority,
          status: task.status,
          due_date: task.due_date.slice(0, 10),
        }}
      />
    </div>
  );
}
