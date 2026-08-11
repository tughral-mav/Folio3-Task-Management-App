import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { TaskPriority, TaskStatus } from "@/lib/types/domain";

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

  const search = filters.search?.trim();
  if (search) {
    // FR17: title/description match, plus assignee name/email match.
    const escaped = search.replace(/[%_,()]/g, " ").trim();
    if (escaped) {
      const { data: matchingUsers } = await supabase
        .from("users")
        .select("id")
        .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
      const userIds = (matchingUsers ?? []).map((u) => u.id);
      const clauses = [
        `title.ilike.%${escaped}%`,
        `description.ilike.%${escaped}%`,
        ...(userIds.length > 0
          ? [`assigned_to.in.(${userIds.join(",")})`]
          : []),
      ];
      query = query.or(clauses.join(","));
    }
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
