"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * FR30/FR31: opening a notification navigates to its context and marks it
 * read. RLS guarantees both the read and the write touch only the caller's
 * own rows (EC-N2); the DB guard trigger limits the update to read_at.
 */
export async function openNotificationAction(id: string) {
  const { profile } = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: notification } = await supabase
    .from("notifications")
    .select("id, task_id, read_at")
    .eq("id", id)
    .maybeSingle();

  // Foreign/unknown IDs: RLS returns nothing — no existence leak (EC-N2).
  if (!notification) redirect("/notifications");

  if (!notification.read_at) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("[openNotification]", error.code, error.message);
  }

  revalidatePath("/notifications");

  // EC-N4: if the task was reassigned away, the destination 404s into the
  // friendly (app) not-found state — the notification is still marked read.
  if (notification.task_id) {
    redirect(
      profile.role === "ADMIN"
        ? `/admin/tasks/${notification.task_id}`
        : `/my/tasks/${notification.task_id}`,
    );
  }
  redirect("/notifications");
}

/** FR30/EC-N3: race-safe bulk read via the SQL function — notifications
 *  arriving mid-call stay unread. */
export async function markAllReadAction() {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) console.error("[markAllRead]", error.code, error.message);
  revalidatePath("/notifications");
}
