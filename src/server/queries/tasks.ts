import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { TaskPriority, TaskStatus } from "@/lib/types/domain";
import { sanitizeSearch } from "@/lib/utils/search";

/**
 * Read-side queries for task surfaces. All run through the user-scoped
 * client, so RLS decides visibility (admin: all; member: own) — these
 * helpers add no privilege.
 */

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type TaskUpdateRow = Database["public"]["Tables"]["task_updates"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["task_activity"]["Row"];

export type UserRef = Pick<UserRow, "id" | "full_name" | "email" | "avatar_url">;
export type TaskListItem = TaskRow & { assignee: UserRef; creator: UserRef };
export type TaskDetail = TaskRow & {
  assignee: UserRef;
  creator: UserRef;
  updates: (TaskUpdateRow & { author: UserRef })[];
  activity: (ActivityRow & { actor: UserRef | null })[];
};

const USER_REF = "id, full_name, email, avatar_url";
const TASK_WITH_USERS = `*,
  assignee:users!tasks_assigned_to_fkey(${USER_REF}),
  creator:users!tasks_created_by_fkey(${USER_REF})`;

export const TASKS_PAGE_SIZE = 25;

export type TaskListFilters = {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string; // user id
  dueFrom?: string; // YYYY-MM-DD
  dueTo?: string;
  overdue?: boolean;
  page?: number;
};

export async function listTasks(filters: TaskListFilters): Promise<{
  tasks: TaskListItem[];
  count: number;
  page: number;
  pageCount: number;
}> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from("tasks")
    .select(TASK_WITH_USERS, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * TASKS_PAGE_SIZE, page * TASKS_PAGE_SIZE - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.assignee) query = query.eq("assigned_to", filters.assignee);
  if (filters.dueFrom) query = query.gte("due_date", `${filters.dueFrom}T00:00:00`);
  if (filters.dueTo) query = query.lte("due_date", `${filters.dueTo}T23:59:59`);
  if (filters.overdue) {
    // FR36/EC-T7: past due and still active.
    query = query
      .lt("due_date", new Date().toISOString())
      .not("status", "in", "(COMPLETED,CANCELLED)");
  }

  const search = filters.search ? sanitizeSearch(filters.search) : "";
  if (search) {
    // FR17: title/description match, plus assignee name/email match. `search`
    // is allowlist-sanitized, so it is a safe ilike literal (Finding #1).
    const { data: matchingUsers } = await supabase
      .from("users")
      .select("id")
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const userIds = (matchingUsers ?? []).map((u) => u.id);
    const clauses = [
      `title.ilike.%${search}%`,
      `description.ilike.%${search}%`,
      ...(userIds.length > 0 ? [`assigned_to.in.(${userIds.join(",")})`] : []),
    ];
    query = query.or(clauses.join(","));
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[listTasks]", error.code, error.message);
    return { tasks: [], count: 0, page: 1, pageCount: 1 };
  }
  const total = count ?? 0;
  return {
    tasks: (data ?? []) as TaskListItem[],
    count: total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE)),
  };
}

/**
 * Finding #2: the member dashboard's "needs attention" must consider ALL of
 * the member's open tasks, not just the most-recent page — otherwise an
 * overdue task sorting past page 1 would be dropped from the safety-net
 * surface. RLS scopes this to the caller's own tasks. Bounded at `limit`
 * (documented) rather than the 25-row list page.
 */
export async function listOpenTasks(limit = 200): Promise<TaskListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_WITH_USERS)
    .not("status", "in", "(COMPLETED,CANCELLED)")
    .order("due_date", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[listOpenTasks]", error.code, error.message);
    return [];
  }
  return (data ?? []) as TaskListItem[];
}

/** A board card carries a Trello-style badge count of its progress updates. */
export type BoardTask = TaskListItem & { updateCount: number };

/**
 * FR37: tasks for a board view — all non-cancelled tasks the caller may see
 * (admin: all; member: own, via RLS), across every board column. Bounded at
 * `limit` (documented) rather than the 25-row list page. Includes the
 * task_updates count for the card "comments" badge (Trello UX).
 */
export async function listBoardTasks(limit = 200): Promise<BoardTask[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_WITH_USERS}, updates:task_updates(count)`)
    .neq("status", "CANCELLED")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listBoardTasks]", error.code, error.message);
    return [];
  }
  return ((data ?? []) as (TaskListItem & { updates: { count: number }[] })[]).map(
    ({ updates, ...task }) => ({
      ...task,
      updateCount: updates?.[0]?.count ?? 0,
    }),
  );
}

export async function getTaskDetail(id: string): Promise<TaskDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select(TASK_WITH_USERS)
    .eq("id", id)
    .maybeSingle();
  if (error || !task) return null;

  const [{ data: updates }, { data: activity }] = await Promise.all([
    supabase
      .from("task_updates")
      .select(`*, author:users!task_updates_author_id_fkey(${USER_REF})`)
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_activity")
      .select(`*, actor:users!task_activity_actor_id_fkey(${USER_REF})`)
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    ...(task as TaskListItem),
    updates: (updates ?? []) as TaskDetail["updates"],
    activity: (activity ?? []) as TaskDetail["activity"],
  };
}

/** ADR-7/EC-T1: assignee candidates are provisioned users only. */
export async function listUsers(): Promise<UserRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) {
    console.error("[listUsers]", error.code, error.message);
    return [];
  }
  return data ?? [];
}
