"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { progressUpdateSchema } from "@/lib/validation/progress";
import { fieldErrors } from "@/lib/validation/tasks";
import { failure, success, type ActionResult } from "@/lib/utils/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * FR19–FR21: the ONLY member write-path to tasks (ADR-3). All authority
 * lives in the submit_progress_update RPC — it locks the task row, verifies
 * the caller is the assignee AT EXECUTION TIME (EC-P4), enforces the D3
 * transition subset and closed-task rules, and fans out one consolidated
 * notification (EC-N6). Admin-assignees use the same path (D4).
 */

export type ProgressFormState = ActionResult<{ updateId: string }> | null;

const RPC_ERRORS: Array<[needle: string, message: string]> = [
  ["TASK_CLOSED", "This task is completed or cancelled — progress can no longer be reported."],
  ["NOT_AUTHORIZED", "You can only report progress on tasks assigned to you."],
  ["INVALID_STATUS_TARGET", "Choose a valid status."],
  ["INVALID_PERCENT", "Percent must be between 0 and 100."],
  ["INVALID_BODY", "Describe your progress (up to 5,000 characters)."],
];

export async function submitProgressAction(
  taskId: string,
  _prev: ProgressFormState,
  formData: FormData,
): Promise<ProgressFormState> {
  await requireUser();

  const parsed = progressUpdateSchema.safeParse({
    body: String(formData.get("body") ?? ""),
    percent: String(formData.get("percent") ?? ""),
    new_status: String(formData.get("new_status") ?? ""),
  });
  if (!parsed.success) {
    return failure("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_progress_update", {
    p_task_id: taskId,
    p_body: parsed.data.body,
    p_percent: parsed.data.percent ?? undefined,
    p_new_status: parsed.data.new_status ?? undefined,
  });

  if (error) {
    const match = RPC_ERRORS.find(([needle]) => error.message.includes(needle));
    if (match) return failure(match[1]);
    console.error("[submitProgress]", error.code, error.message);
    return failure("Unable to submit your update right now. Please try again.");
  }

  revalidatePath(`/my/tasks/${taskId}`);
  revalidatePath("/my/tasks");
  revalidatePath("/my");
  return success({ updateId: data as string });
}
