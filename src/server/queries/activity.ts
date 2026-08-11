import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityRow, UserRef } from "@/server/queries/tasks";

export type ActivityWithTask = ActivityRow & {
  actor: UserRef | null;
  task: { id: string; title: string } | null;
};

/**
 * FR25/Story 4.4: recent activity, RLS-scoped — members see events on their
 * own assigned tasks only; admins see everything. No extra filtering here.
 */
export async function listRecentActivity(limit = 25): Promise<ActivityWithTask[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("task_activity")
    .select(
      `*,
       actor:users!task_activity_actor_id_fkey(id, full_name, email, avatar_url),
       task:tasks!task_activity_task_id_fkey(id, title)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listRecentActivity]", error.code, error.message);
    return [];
  }
  return (data ?? []) as ActivityWithTask[];
}
