import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dayKey, formatDate } from "@/lib/utils/dates";
import type { TaskStatus } from "@/lib/types/domain";

export type AdminStats = {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  completed: number;
  overdue: number;
};

export type DailyActivity = {
  day: string; // YYYY-MM-DD
  label: string;
  tasksAssigned: number;
  updates: number;
};

/**
 * FR45: per-day tasks-assigned and progress-updates over a recent window,
 * for the admin insights dashboard. Admin RLS returns all rows; buckets are
 * grouped by server day. Rows come newest-first.
 */
export async function getDailyActivity(days = 14): Promise<{
  rows: DailyActivity[];
  totals: { tasksAssigned: number; updates: number; updatesToday: number };
  maxUpdates: number;
}> {
  const supabase = await createSupabaseServerClient();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [tasksRes, updatesRes] = await Promise.all([
    supabase.from("tasks").select("created_at").gte("created_at", sinceIso),
    supabase
      .from("task_updates")
      .select("created_at")
      .gte("created_at", sinceIso),
  ]);
  if (tasksRes.error) console.error("[getDailyActivity/tasks]", tasksRes.error.message);
  if (updatesRes.error) console.error("[getDailyActivity/updates]", updatesRes.error.message);

  const buckets = new Map<string, DailyActivity>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = dayKey(d);
    buckets.set(key, { day: key, label: formatDate(d), tasksAssigned: 0, updates: 0 });
  }
  for (const t of tasksRes.data ?? []) {
    const b = buckets.get(dayKey(t.created_at));
    if (b) b.tasksAssigned += 1;
  }
  for (const u of updatesRes.data ?? []) {
    const b = buckets.get(dayKey(u.created_at));
    if (b) b.updates += 1;
  }

  const rows = [...buckets.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
  return {
    rows,
    totals: {
      tasksAssigned: rows.reduce((s, r) => s + r.tasksAssigned, 0),
      updates: rows.reduce((s, r) => s + r.updates, 0),
      updatesToday: buckets.get(dayKey(new Date()))?.updates ?? 0,
    },
    maxUpdates: Math.max(1, ...rows.map((r) => r.updates)),
  };
}

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
