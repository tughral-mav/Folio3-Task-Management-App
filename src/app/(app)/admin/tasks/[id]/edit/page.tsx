import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateTaskAction } from "@/server/actions/tasks";
import { getTaskDetail, listUsers } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        back={{ href: `/admin/tasks/${task.id}`, label: task.title }}
        title="Edit task"
        subtitle="The assignee (and the task creator, if someone else) are notified of the change."
      />
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
