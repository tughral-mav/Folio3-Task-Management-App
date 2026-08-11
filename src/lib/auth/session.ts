import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export type SessionProfile = {
  user: User;
  profile: UserProfile | null;
};

/**
 * Per-request (React cache) session + provisioned profile lookup. The profile
 * comes from the DB on EVERY request — never from a client-influenceable
 * claim (SEC-5); demotion takes effect on the next request (EC-R2).
 */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    return { user, profile: profile ?? null };
  },
);

/** Guard for authenticated surfaces. A session without a provisioned profile
 *  (should be impossible — ADR-1) is denied: RLS already gives it nothing. */
export async function requireUser(): Promise<{
  user: User;
  profile: UserProfile;
}> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/access-denied?reason=unprovisioned");
  return { user: session.user, profile: session.profile };
}

/** Guard for ADMIN surfaces/actions — checked at execution time (SEC-7). */
export async function requireAdmin(): Promise<{
  user: User;
  profile: UserProfile;
}> {
  const session = await requireUser();
  if (session.profile.role !== "ADMIN") redirect("/my");
  return session;
}
