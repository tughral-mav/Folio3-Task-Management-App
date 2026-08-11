import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Next.js 16 proxy (renamed from middleware): refreshes the Supabase session
 * cookie on every request and applies COARSE auth redirects only.
 * Role checks deliberately do NOT live here (architecture §5) — they run in
 * server layouts/actions and are always re-enforced by RLS underneath.
 */

const PUBLIC_PATHS = ["/login", "/access-denied", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the token when expired; do not run other logic between client
  // creation and getUser() (session can be left unsynced otherwise).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep freshly-rotated session cookies on the redirect response.
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  };

  if (!user && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }
  if (user && pathname === "/login") {
    return redirectTo("/");
  }

  return supabaseResponse;
}

export const config = {
  // Everything except static assets and files with extensions.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
