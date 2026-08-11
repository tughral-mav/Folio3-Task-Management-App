import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin Dashboard" };

// Placeholder shell — stat cards, search/filter, and recent activity land
// with Epics 3 & 6 (FR34). Existing so role routing (FR5, Test 5) is real.
export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Welcome, {profile.full_name || profile.email}.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        Task creation, assignment, and team monitoring arrive with Epic 3.
      </div>
    </div>
  );
}
