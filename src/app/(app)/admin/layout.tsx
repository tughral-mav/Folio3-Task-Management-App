import { requireAdmin } from "@/lib/auth/session";

/**
 * ADMIN-only subtree (FR9/SEC-7). Server-side guard on every request —
 * a TEAM_MEMBER hitting any /admin route is redirected before render.
 * RLS independently denies admin data regardless of this guard.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <>{children}</>;
}
