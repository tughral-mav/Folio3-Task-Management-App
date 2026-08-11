import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types/domain";

/**
 * SEC-14: server-side validation is authoritative — these schemas run inside
 * server actions regardless of any client-side checks. Limits mirror the DB
 * constraints (title ≤200, description ≤10000) so users get friendly
 * messages instead of constraint violations.
 */

const title = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be 200 characters or fewer.");

const description = z
  .string()
  .trim()
  .max(10000, "Description must be 10,000 characters or fewer.")
  .default("");

const assignedTo = z.uuid({ error: "Choose an assignee." });

const priority = z.enum(TASK_PRIORITIES, { error: "Choose a priority." });

const status = z.enum(TASK_STATUSES, { error: "Choose a valid status." });

/**
 * EC-T8: due date is required at creation. Accepts YYYY-MM-DD from
 * <input type="date"> and anchors it to **noon UTC** (Finding #3). Noon UTC
 * keeps the same calendar day for every real-world timezone offset
 * (−12…+13), so the day shown never drifts from the day the admin entered,
 * regardless of server or viewer timezone.
 */
const dueDate = z
  .string()
  .min(1, "Due date is required.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .transform((value, ctx) => {
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return date.toISOString();
  });

export const taskCreateSchema = z.object({
  title,
  description,
  assigned_to: assignedTo,
  priority,
  due_date: dueDate,
});

export const taskEditSchema = z.object({
  title,
  description,
  assigned_to: assignedTo,
  priority,
  status,
  due_date: dueDate,
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskEditInput = z.infer<typeof taskEditSchema>;

/** Stable, UI-friendly field error map built from Zod issues (no deprecated
 *  flatten APIs). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
