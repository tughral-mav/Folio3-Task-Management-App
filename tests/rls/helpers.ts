import { Client } from "pg";

/**
 * RLS test harness (test strategy §1). Connects to the local Supabase
 * Postgres and impersonates PostgREST roles via SET LOCAL ROLE +
 * request.jwt.claims inside a rolled-back transaction, exactly as PostgREST
 * does per request — so `auth.uid()` and every policy behave as in
 * production. The superuser (`postgres`) is never used for assertions: it
 * bypasses RLS.
 */

export const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Seeded identities (supabase/seed.sql).
export const ADMIN = "00000000-0000-4000-8000-000000000001";
export const MEMBER_A = "00000000-0000-4000-8000-000000000002";
export const MEMBER_B = "00000000-0000-4000-8000-000000000003";

// Seeded tasks.
export const TASK_A1 = "00000000-0000-4000-9000-000000000001"; // MEMBER_A, TODO
export const TASK_A2 = "00000000-0000-4000-9000-000000000002"; // MEMBER_A, IN_PROGRESS
export const TASK_B3 = "00000000-0000-4000-9000-000000000003"; // MEMBER_B, BLOCKED
export const TASK_B4 = "00000000-0000-4000-9000-000000000004"; // MEMBER_B, COMPLETED

export type Query = (text: string, params?: unknown[]) => Promise<unknown[]>;

export function makeClient(): Client {
  return new Client({ connectionString: DB_URL });
}

type Actor = { role: "authenticated" | "anon"; sub?: string };

async function runAs<T>(
  client: Client,
  actor: Actor,
  fn: (q: Query) => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE ${actor.role}`);
    const claims = JSON.stringify(
      actor.sub ? { sub: actor.sub, role: actor.role } : { role: actor.role },
    );
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      claims,
    ]);
    const q: Query = async (text, params) =>
      (await client.query(text, params)).rows;
    return await fn(q);
  } finally {
    await client.query("ROLLBACK");
  }
}

/** Run as an authenticated user (role = TEAM_MEMBER/ADMIN decided by DB). */
export function asUser<T>(
  client: Client,
  sub: string,
  fn: (q: Query) => Promise<T>,
) {
  return runAs(client, { role: "authenticated", sub }, fn);
}

/** Run as the unauthenticated anon role. */
export function asAnon<T>(client: Client, fn: (q: Query) => Promise<T>) {
  return runAs(client, { role: "anon" }, fn);
}
