import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { allowedGoogleDomain } from "@/lib/env";
import { getSessionProfile } from "@/lib/auth/session";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Sign in" };

// FR1: the ONLY authentication surface. No signup, no passwords.
export default async function LoginPage() {
  const session = await getSessionProfile();
  if (session?.profile) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Folio3 Task Manager
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in with your <strong>@{allowedGoogleDomain()}</strong> Google
          account. Personal Google accounts are not permitted.
        </p>
        <div className="mt-8">
          <GoogleSignInButton domainHint={allowedGoogleDomain()} />
        </div>
        <p className="mt-6 text-xs text-zinc-500">
          First time here? Your account is created automatically when you sign
          in — there is no registration form.
        </p>
      </div>
    </main>
  );
}
