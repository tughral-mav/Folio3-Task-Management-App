import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/types/domain";

export type AdminStats = {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  completed: number;
  overdue: number;
};

/**
 * FR34: dashboard counts via head-only count queries (indexed, no row
 * transfer). RLS scopes admins to all tasks. Overdue per FR36/EC-T7.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createSupabaseServerClient();
  const base = () =>
    supabase.from("tasks").select("id", { count: "exact", head: true });

  const resolve = async (
    query: PromiseLike<{ count: number | null; error: { code?: string; message?: string } | null }>,
  ) => {
    const { count, error } = await query;
    if (error) console.error("[getAdminStats]", error.code, error.message);
    return count ?? 0;
  };

  const byStatus = (s: TaskStatus) => resolve(base().eq("status", s));
  const nowIso = new Date().toISOString();

  const [total, todo, inProgress, blocked, completed, overdue] =
    await Promise.all([
      resolve(base()),
      byStatus("TODO"),
      byStatus("IN_PROGRESS"),
      byStatus("BLOCKED"),
      byStatus("COMPLETED"),
      resolve(
        base().lt("due_date", nowIso).not("status", "in", "(COMPLETED,CANCELLED)"),
      ),
    ]);

  return { total, todo, inProgress, blocked, completed, overdue };
}
