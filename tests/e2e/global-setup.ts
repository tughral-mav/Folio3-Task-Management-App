import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * E2E auth via session injection (test strategy §2): Google blocks scripted
 * logins, so instead of driving the real OAuth handshake we mint a Supabase
 * session for each seeded user through the local GoTrue admin API, capture
 * the exact auth cookies `@supabase/ssr` writes (so the format matches what
 * the app reads), and save them as Playwright storageState files. Everything
 * *after* the handshake is then a real browser test against the real backend.
 *
 * Runs only where a local Supabase stack is reachable (CI / `supabase start`).
 */

const AUTH_DIR = path.join(__dirname, ".auth");

const SEED_USERS = {
  admin: "seed.admin@folio3.com",
  member: "seed.member.a@folio3.com",
} as const;

async function captureCookies(
  email: string,
  url: string,
  anonKey: string,
  serviceKey: string,
): Promise<{ name: string; value: string }[]> {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new Error(`generateLink failed for ${email}: ${error?.message}`);
  }

  const captured: { name: string; value: string }[] = [];
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (list) =>
        list.forEach((c) => captured.push({ name: c.name, value: c.value })),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) {
    throw new Error(`verifyOtp failed for ${email}: ${verifyError.message}`);
  }
  if (captured.length === 0) {
    throw new Error(`no auth cookies captured for ${email}`);
  }
  return captured;
}

function toStorageState(cookies: { name: string; value: string }[]) {
  return {
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      expires: -1, // session cookie — no expiry within the test run
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
    origins: [],
  };
}

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and " +
        "SUPABASE_SERVICE_ROLE_KEY pointing at a local Supabase stack. Run in CI " +
        "or start one with `npx supabase start`.",
    );
  }

  mkdirSync(AUTH_DIR, { recursive: true });
  for (const [role, email] of Object.entries(SEED_USERS)) {
    const cookies = await captureCookies(email, url, anonKey, serviceKey);
    writeFileSync(
      path.join(AUTH_DIR, `${role}.json`),
      JSON.stringify(toStorageState(cookies), null, 2),
    );
  }
}
