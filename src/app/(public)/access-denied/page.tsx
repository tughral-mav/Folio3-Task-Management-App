import type { Metadata } from "next";
import Link from "next/link";
import { allowedGoogleDomain } from "@/lib/env";
import { signOutAction } from "@/server/actions/auth";
import { BrandMark } from "@/components/ui/brand-mark";

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
    <main className="flex flex-1 items-center justify-center bg-linear-to-br from-indigo-50 via-white to-sky-100 p-4 sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl md:grid-cols-2">
        {/* LEFT — explanation + actions */}
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-10 lg:p-12">
          <BrandMark />

          <div>
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M12 3l7 3v5c0 4.2-2.8 7.4-7 8.5C7.8 21.4 5 18.2 5 14V6l7-3z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9v4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Access denied
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {message}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Sign in with your{" "}
              <strong className="font-semibold text-zinc-800">
                @{allowedGoogleDomain()}
              </strong>{" "}
              Google account to use the Folio3 Task Manager.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Try a different account
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT — sober "secure access" panel (stacks away on mobile) */}
        <div className="relative hidden overflow-hidden bg-linear-to-br from-slate-700 via-slate-800 to-indigo-900 p-10 md:flex md:flex-col md:justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-indigo-500/20 blur-2xl"
          />

          {/* Shield / secure-gate illustration */}
          <div className="relative flex flex-1 items-center justify-center py-6">
            <svg
              viewBox="0 0 260 260"
              className="h-auto w-full max-w-52 drop-shadow-lg"
              role="img"
              aria-hidden="true"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="130" cy="130" r="96" fill="#ffffff" opacity="0.06" />
              <circle cx="130" cy="130" r="70" fill="#ffffff" opacity="0.06" />

              {/* Shield body */}
              <path
                d="M130 46l58 24v40c0 36-24 62-58 72-34-10-58-36-58-72V70l58-24z"
                fill="#ffffff"
                opacity="0.12"
              />
              <path
                d="M130 46l58 24v40c0 36-24 62-58 72-34-10-58-36-58-72V70l58-24z"
                stroke="#c7d2fe"
                strokeWidth="3"
                strokeLinejoin="round"
              />

              {/* Padlock */}
              <path
                d="M116 118v-8a14 14 0 0 1 28 0v8"
                stroke="#e0e7ff"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <rect
                x="104"
                y="118"
                width="52"
                height="42"
                rx="8"
                fill="#818cf8"
              />
              <circle cx="130" cy="136" r="6" fill="#ffffff" />
              <rect x="127" y="138" width="6" height="12" rx="3" fill="#ffffff" />
            </svg>
          </div>

          {/* Tagline */}
          <div className="relative">
            <h2 className="text-2xl font-semibold leading-snug text-white">
              Secure access, by design
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
              The Folio3 Task Manager is limited to verified{" "}
              <span className="font-medium text-slate-100">
                @{allowedGoogleDomain()}
              </span>{" "}
              Google accounts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
