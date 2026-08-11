import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth/domain";
import { allowedGoogleDomain } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * OAuth callback (architecture §4). The DB trigger is the authoritative gate
 * (ADR-1): a rejected identity never gets an auth user, so the code exchange
 * itself fails. The checks here are the server-side backstop (SEC-3) and UX
 * routing — they must never be the only line of defense.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  // Only same-origin relative paths — no open redirects.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/access-denied?reason=denied`);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Includes the trigger-rejection path ("database error saving new user").
    return NextResponse.redirect(`${origin}/access-denied?reason=denied`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Backstop 1 (SEC-2): verified Folio3 email, exact domain match.
  if (
    !user ||
    !user.email ||
    !isAllowedEmail(user.email, allowedGoogleDomain())
  ) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/access-denied?reason=domain`);
  }

  // Backstop 2 (ADR-1): a provisioned profile row must exist.
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/access-denied?reason=unprovisioned`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
