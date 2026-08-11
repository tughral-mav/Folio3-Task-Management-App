import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

// FR5: the DB-stored role decides the landing dashboard.
export default async function HomePage() {
  const { profile } = await requireUser();
  redirect(profile.role === "ADMIN" ? "/admin" : "/my");
}
