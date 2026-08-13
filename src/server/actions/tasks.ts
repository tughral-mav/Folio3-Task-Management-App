"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import {
  fieldErrors,
  taskCreateSchema,
  taskEditSchema,
} from "@/lib/validation/tasks";
import { failure, mapDbError, success, type ActionResult } from "@/lib/utils/errors";
import { TASK_STATUSES, type TaskStatus } from "@/lib/types/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Task mutations. Defense in depth (SEC-7): guard at execution time, THEN the
 * write runs with the caller's session so RLS re-checks the rule. Activity and
 * notifications fan out atomically via DB triggers (ADR-4).
 *
 * v0.4/FR42: creation (createTaskAction) is open to any provisioned user with
 * created_by pinned to self. Edit/reassign/set-any-status (updateTaskAction,
 * moveTaskStatusAction) remain admin-only.
 */

export type TaskFormState = ActionResult<{ taskId: string }> | null;

function formValues(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    assigned_to: String(formData.get("assigned_to") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    due_date: String(formData.get("due_date") ?? ""),
  };
}

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  // FR42: any provisioned user may create + assign. RLS re-checks
  // (is_provisioned + created_by = self) underneath.
  const { user, profile } = await requireUser();

  const parsed = taskCreateSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return failure("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return mapDbError(
      "createTask",
      error,
      "Unable to create the task right now. Please try again.",
    );
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/my/tasks");
  redirect(
    profile.role === "ADMIN"
      ? `/admin/tasks/${data.id}`
      : `/my/tasks/${data.id}`,
  );
}

export async function updateTaskAction(
  taskId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireAdmin();

  const parsed = taskEditSchema.safeParse({
    ...formValues(formData),
    status: String(formData.get("status") ?? ""),
  });
  if (!parsed.success) {
    return failure("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("id", taskId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return mapDbError(
      "updateTask",
      error,
      "Unable to update the task right now. Please try again.",
    );
  }

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${taskId}`);
  redirect(`/admin/tasks/${taskId}`);
}

/**
 * Trello-style inline "Add a card": admin quick-creates a task directly in a
 * board column (status). Same authority/validation as createTaskAction, but
 * returns a result instead of redirecting so the composer can stay open.
 */
export async function quickCreateTaskAction(
  status: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { user } = await requireAdmin();

  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    return failure("That is not a valid column.");
  }

  const parsed = taskCreateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: "",
    assigned_to: String(formData.get("assigned_to") ?? ""),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    due_date: String(formData.get("due_date") ?? ""),
  });
  if (!parsed.success) {
    return failure("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, created_by: user.id, status: status as TaskStatus })
    .select("id")
    .single();

  if (error || !data) {
    return mapDbError(
      "quickCreateTask",
      error,
      "Unable to add the card right now. Please try again.",
    );
  }

  revalidatePath("/admin/board");
  revalidatePath("/admin/tasks");
  return success({ taskId: data.id });
}

/**
 * FR38: admin moves a task between board columns — a status-only change.
 * Same authority as any admin task update: requireAdmin at execution +
 * admin-only RLS on the write; the DB triggers record activity and notify.
 */
export async function moveTaskStatusAction(
  taskId: string,
  status: string,
): Promise<ActionResult<{ status: TaskStatus }>> {
  await requireAdmin();

  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    return failure("That is not a valid status.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: status as TaskStatus })
    .eq("id", taskId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return mapDbError(
      "moveTaskStatus",
      error,
      "Unable to move the task right now. Please try again.",
    );
  }

  revalidatePath("/admin/board");
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${taskId}`);
  return success({ status: status as TaskStatus });
}
