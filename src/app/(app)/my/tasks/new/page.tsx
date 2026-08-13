import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createTaskAction } from "@/server/actions/tasks";
import { listUsers } from "@/server/queries/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "New task" };

// FR42: any provisioned member can create a task and assign it to anyone.
// Same validated form + action as the admin create page; RLS pins created_by.
export default async function MemberNewTaskPage() {
  await requireUser();
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/my/tasks", label: "My Tasks" }}
        title="Create a task"
        subtitle="Assign it to anyone on the team. They're notified as soon as it's saved."
      />
      <TaskForm
        action={createTaskAction}
        users={users}
        submitLabel="Create task"
      />
    </div>
  );
}
