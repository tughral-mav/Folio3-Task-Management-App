import type { Metadata } from "next";
import { createTaskAction } from "@/server/actions/tasks";
import { listUsers } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "New task" };

// FR10: admin creates a task; activity + assignee notification fan out in
// the same DB transaction (ADR-4) — Test 6's write path.
export default async function NewTaskPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/tasks", label: "Tasks" }}
        title="Create a task"
        subtitle="The assignee is notified as soon as the task is saved."
      />
      <TaskForm
        action={createTaskAction}
        users={users}
        submitLabel="Create task"
      />
    </div>
  );
}
