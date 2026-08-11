import type { Metadata } from "next";
import Link from "next/link";
import { createTaskAction } from "@/server/actions/tasks";
import { listUsers } from "@/server/queries/tasks";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "New task" };

// FR10: admin creates a task; activity + assignee notification fan out in
// the same DB transaction (ADR-4) — Test 6's write path.
export default async function NewTaskPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tasks" className="text-sm text-zinc-500 hover:underline">
          ← Tasks
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Create a task
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          The assignee is notified as soon as the task is saved.
        </p>
      </div>
      <TaskForm
        action={createTaskAction}
        users={users}
        submitLabel="Create task"
      />
    </div>
  );
}
