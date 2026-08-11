import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];

/**
 * FR26/FR31: RLS restricts every query here to recipient = caller; the
 * explicit filters just document intent and keep the partial unread index hot.
 */
export async function listNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listNotifications]", error.code, error.message);
    return [];
  }
  return data ?? [];
}

/** FR29: badge count — cheap thanks to the partial index on unread rows. */
export async function unreadCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error("[unreadCount]", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}
