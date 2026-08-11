import { z } from "zod";
import { MEMBER_STATUS_TARGETS } from "@/lib/types/domain";

/**
 * FR19/D3: progress update — required text, optional percent 0–100, optional
 * status transition restricted to the member-permitted subset (EC-T5).
 * The submit_progress_update RPC re-validates ALL of this in the database;
 * this schema exists for friendly errors before the round-trip (SEC-14).
 */
export const progressUpdateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Describe your progress.")
    .max(5000, "Progress updates must be 5,000 characters or fewer."),
  percent: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        ctx.addIssue({
          code: "custom",
          message: "Percent must be a whole number between 0 and 100.",
        });
        return z.NEVER;
      }
      return n;
    }),
  new_status: z
    .string()
    .transform((value, ctx) => {
      if (value === "") return null;
      if (!(MEMBER_STATUS_TARGETS as readonly string[]).includes(value)) {
        ctx.addIssue({ code: "custom", message: "Choose a valid status." });
        return z.NEVER;
      }
      return value as (typeof MEMBER_STATUS_TARGETS)[number];
    }),
});

export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
