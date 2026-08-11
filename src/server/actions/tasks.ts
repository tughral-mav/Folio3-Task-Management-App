"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  fieldErrors,
  taskCreateSchema,
  taskEditSchema,
} from "@/lib/validation/tasks";
import { failure, mapDbError, type ActionResult } from "@/lib/utils/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin-only task mutations (FR10, FR13). Defense in depth (SEC-7):
 * requireAdmin() at execution time, THEN the write runs with the caller's
 * session so RLS re-checks admin + created_by pinning. Activity and
 * notifications fan out atomically via DB triggers (ADR-4) — nothing to
 * orchestrate here.
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
  const { user } = await requireAdmin();

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
  redirect(`/admin/tasks/${data.id}`);
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
