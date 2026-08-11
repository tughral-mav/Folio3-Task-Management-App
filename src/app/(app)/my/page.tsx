import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Tasks" };

// Placeholder shell — assigned tasks, needs-attention, and filters land with
// Epics 4 & 6 (FR35). Existing so role routing (FR5, Tests 1/4) is real.
export default async function MemberDashboardPage() {
  const { profile } = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">My Tasks</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Welcome, {profile.full_name || profile.email}.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        No tasks assigned to you yet.
      </div>
    </div>
  );
}
