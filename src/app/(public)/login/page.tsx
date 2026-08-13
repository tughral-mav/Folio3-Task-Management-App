import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { allowedGoogleDomain } from "@/lib/env";
import { getSessionProfile } from "@/lib/auth/session";
import { BrandMark } from "@/components/ui/brand-mark";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Sign in" };

// FR1: the ONLY authentication surface. No signup, no passwords, no inputs.
export default async function LoginPage() {
  const session = await getSessionProfile();
  if (session?.profile) redirect("/");

  const domain = allowedGoogleDomain();

  return (
    <main className="flex flex-1 items-center justify-center bg-linear-to-br from-indigo-50 via-white to-sky-100 p-4 sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl md:grid-cols-2">
        {/* LEFT — brand + sign-in action */}
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-10 lg:p-12">
          <BrandMark />

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              Welcome
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Sign in to plan, assign, and track your team&apos;s tasks — all in
              one place.
            </p>
          </div>

          {/* @folio3.com domain notice (kept per FR1) */}
          <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600"
              fill="none"
            >
              <path
                d="M12 3l7 3v5c0 4.2-2.8 7.4-7 8.5C7.8 21.4 5 18.2 5 14V6l7-3z"
                fill="currentColor"
                opacity="0.15"
              />
              <path
                d="M12 3l7 3v5c0 4.2-2.8 7.4-7 8.5C7.8 21.4 5 18.2 5 14V6l7-3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9.2 12l2 2 3.6-3.8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm leading-relaxed text-zinc-600">
              Sign in with your{" "}
              <strong className="font-semibold text-zinc-800">
                @{domain}
              </strong>{" "}
              Google account. Personal Google accounts are not permitted.
            </p>
          </div>

          <GoogleSignInButton domainHint={domain} />

          <p className="text-xs leading-relaxed text-zinc-500">
            First time here? Your account is created automatically when you sign
            in — there is no registration form.
          </p>
        </div>

        {/* RIGHT — marketing / illustration panel (stacks away on mobile) */}
        <div className="relative hidden overflow-hidden bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 md:flex md:flex-col md:justify-between">
          {/* Soft decorative glow shapes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-violet-400/20 blur-2xl"
          />

          {/* Centered task-board illustration */}
          <div className="relative flex flex-1 items-center justify-center py-6">
            <svg
              viewBox="0 0 320 300"
              className="h-auto w-full max-w-xs drop-shadow-lg"
              role="img"
              aria-hidden="true"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="loginCardTitle" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#c7d2fe" />
                  <stop offset="1" stopColor="#a5b4fc" />
                </linearGradient>
              </defs>

              {/* Offset back card for depth */}
              <rect
                x="58"
                y="74"
                width="216"
                height="178"
                rx="18"
                fill="#ffffff"
                opacity="0.14"
              />

              {/* Main task card */}
              <rect
                x="44"
                y="56"
                width="216"
                height="184"
                rx="18"
                fill="#ffffff"
              />

              {/* Header: title placeholder + member avatars */}
              <rect
                x="64"
                y="78"
                width="96"
                height="12"
                rx="6"
                fill="url(#loginCardTitle)"
              />
              <rect x="64" y="98" width="60" height="8" rx="4" fill="#e2e8f0" />
              <circle cx="218" cy="86" r="10" fill="#61bd4f" />
              <circle cx="200" cy="86" r="10" fill="#f2d600" />

              {/* Task row 1 — done */}
              <rect x="64" y="126" width="16" height="16" rx="5" fill="#61bd4f" />
              <path
                d="M67.5 134.5l3 3 6-6.5"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="90" y="130" width="122" height="8" rx="4" fill="#e2e8f0" />

              {/* Task row 2 — done */}
              <rect x="64" y="154" width="16" height="16" rx="5" fill="#61bd4f" />
              <path
                d="M67.5 162.5l3 3 6-6.5"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="90" y="158" width="96" height="8" rx="4" fill="#e2e8f0" />

              {/* Task row 3 — open */}
              <rect
                x="64"
                y="182"
                width="16"
                height="16"
                rx="5"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="2"
              />
              <rect x="90" y="186" width="112" height="8" rx="4" fill="#eef2f7" />

              {/* Progress track */}
              <rect x="64" y="210" width="176" height="8" rx="4" fill="#eef2f7" />
              <rect x="64" y="210" width="116" height="8" rx="4" fill="#6366f1" />

              {/* Floating "done" badge on the card corner */}
              <circle cx="250" cy="52" r="22" fill="#22c55e" />
              <path
                d="M240 52l7 7 13-14"
                stroke="#ffffff"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Tagline */}
          <div className="relative">
            <h2 className="text-2xl font-semibold leading-snug text-white">
              Manage your team&apos;s tasks efficiently
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-indigo-100">
              Assign work, capture progress updates, and keep everyone in sync —
              from one clean, shared board.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
