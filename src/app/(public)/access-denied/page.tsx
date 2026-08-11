import type { Metadata } from "next";
import Link from "next/link";
import { allowedGoogleDomain } from "@/lib/env";
import { signOutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Access denied" };

const REASONS: Record<string, string> = {
  domain: "This application is only available to Folio3 employees.",
  unprovisioned:
    "Your account could not be set up. Please try signing in again.",
  denied: "Sign-in was not completed.",
};

// EC-A1: friendly rejection surface for non-Folio3 identities.
export default async function AccessDeniedPage({
  searchParams,
}: PageProps<"/access-denied">) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "denied";
  const message = REASONS[reason] ?? REASONS.denied;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl"
        >
          ⛔
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in with your <strong>@{allowedGoogleDomain()}</strong> Google
          account to use the Folio3 Task Manager.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Try a different account
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
