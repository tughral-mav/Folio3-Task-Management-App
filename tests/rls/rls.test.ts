import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import {
  ADMIN,
  MEMBER_A,
  MEMBER_B,
  TASK_A1,
  TASK_B3,
  TASK_B4,
  asAnon,
  asUser,
  makeClient,
} from "./helpers";

/**
 * Adversarial RLS / authorization suite (Story 7.1). Maps to mandated Tests
 * 10 (IDOR), 11 (privilege escalation), 12 (admin-only action) and the
 * security matrix in docs/requirements/security-requirements.md (SEC-8).
 * Runs against the CI local Supabase stack.
 */

let client: Client;

async function rejects(p: Promise<unknown>): Promise<boolean> {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}

/** Security property: the caller obtains no rows — whether RLS filters them
 *  to empty or a revoked grant raises permission-denied. */
async function obtainsNoRows(p: Promise<unknown[]>): Promise<boolean> {
  try {
    return (await p).length === 0;
  } catch {
    return true;
  }
}

beforeAll(async () => {
  client = makeClient();
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

describe("anon has zero access", () => {
  it("obtains no rows from any table", async () => {
    await asAnon(client, async (q) => {
      for (const t of [
        "users",
        "tasks",
        "task_updates",
        "notifications",
        "task_activity",
      ]) {
        const noneObtained = await obtainsNoRows(q(`select * from public.${t}`));
        expect(noneObtained, `anon should get no ${t}`).toBe(true);
      }
    });
  });

  it("cannot insert a task", async () => {
    const blocked = await asAnon(client, (q) =>
      rejects(
        q(
          `insert into public.tasks (title, created_by, assigned_to, due_date)
           values ('x', $1, $1, now())`,
          [MEMBER_A],
        ),
      ),
    );
    expect(blocked).toBe(true);
  });
});

describe("tasks visibility (FR14 / Test 10 IDOR)", () => {
  it("member A sees own assigned tasks only, never member B's", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = (await q(
        "select id, assigned_to from public.tasks",
      )) as { assigned_to: string }[];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.assigned_to === MEMBER_A)).toBe(true);
    });
  });

  it("member A cannot read member B's task by id (no IDOR)", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q("select id from public.tasks where id = $1", [
        TASK_B3,
      ]);
      expect(rows).toHaveLength(0);
    });
  });

  it("admin sees all tasks", async () => {
    await asUser(client, ADMIN, async (q) => {
      const rows = await q("select id from public.tasks");
      expect(rows.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe("tasks mutation (Test 12 admin-only)", () => {
  it("member cannot insert a task", async () => {
    const blocked = await asUser(client, MEMBER_A, (q) =>
      rejects(
        q(
          `insert into public.tasks (title, created_by, assigned_to, due_date)
           values ('sneaky', $1, $1, now())`,
          [MEMBER_A],
        ),
      ),
    );
    expect(blocked).toBe(true);
  });

  it("member cannot directly update a task they are assigned (status bypass)", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q(
        "update public.tasks set status = 'COMPLETED' where id = $1 returning id",
        [TASK_A1],
      );
      // RLS has no member UPDATE policy → zero rows affected, no error.
      expect(rows).toHaveLength(0);
    });
  });

  it("member cannot reassign someone else's task", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q(
        "update public.tasks set assigned_to = $1 where id = $2 returning id",
        [MEMBER_A, TASK_B3],
      );
      expect(rows).toHaveLength(0);
    });
  });

  it("nobody can delete a task (no DELETE path, A1)", async () => {
    await asUser(client, ADMIN, async (q) => {
      const rows = await q(
        "delete from public.tasks where id = $1 returning id",
        [TASK_A1],
      );
      expect(rows).toHaveLength(0);
    });
  });

  it("admin can insert a task only with created_by = self", async () => {
    await asUser(client, ADMIN, async (q) => {
      const ok = await q(
        `insert into public.tasks (title, created_by, assigned_to, due_date)
         values ('legit', $1, $2, now()) returning id`,
        [ADMIN, MEMBER_A],
      );
      expect(ok).toHaveLength(1);
    });
    // created_by spoofing rejected by WITH CHECK
    const blocked = await asUser(client, ADMIN, (q) =>
      rejects(
        q(
          `insert into public.tasks (title, created_by, assigned_to, due_date)
           values ('spoof', $1, $2, now())`,
          [MEMBER_A, MEMBER_A],
        ),
      ),
    );
    expect(blocked).toBe(true);
  });
});

describe("privilege escalation (Test 11)", () => {
  it("member cannot change their own role via direct update", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q(
        "update public.users set role = 'ADMIN' where id = $1 returning id",
        [MEMBER_A],
      );
      // No user UPDATE policy for authenticated → zero rows; guard trigger
      // is the second line if a policy ever appeared.
      expect(rows).toHaveLength(0);
    });
    // Confirm the role really did not change (fresh transaction, admin view).
    await asUser(client, ADMIN, async (q) => {
      const rows = (await q(
        "select role from public.users where id = $1",
        [MEMBER_A],
      )) as { role: string }[];
      expect(rows[0].role).toBe("TEAM_MEMBER");
    });
  });

  it("member cannot promote another user", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q(
        "update public.users set role = 'ADMIN' where id = $1 returning id",
        [MEMBER_B],
      );
      expect(rows).toHaveLength(0);
    });
  });
});

describe("task_updates immutability (A3 / SEC-18)", () => {
  it("member can read updates on own task, not on others'", async () => {
    await asUser(client, MEMBER_B, async (q) => {
      const rows = (await q(
        "select task_id from public.task_updates",
      )) as { task_id: string }[];
      // MEMBER_B is assigned B3/B4; must not see MEMBER_A's update on A2.
      expect(rows.every((r) => r.task_id !== null)).toBe(true);
      const foreign = await q(
        "select id from public.task_updates where task_id = $1",
        ["00000000-0000-4000-9000-000000000002"],
      );
      expect(foreign).toHaveLength(0);
    });
  });

  it("nobody can update or delete a progress update", async () => {
    await asUser(client, ADMIN, async (q) => {
      const upd = await q(
        "update public.task_updates set body = 'tampered' returning id",
      );
      expect(upd).toHaveLength(0);
      const del = await q("delete from public.task_updates returning id");
      expect(del).toHaveLength(0);
    });
  });
});

describe("task_activity append-only (SEC-17)", () => {
  it("nobody can update or delete activity", async () => {
    await asUser(client, ADMIN, async (q) => {
      const upd = await q(
        "update public.task_activity set type = 'TASK_UPDATED' returning id",
      );
      expect(upd).toHaveLength(0);
      const del = await q("delete from public.task_activity returning id");
      expect(del).toHaveLength(0);
    });
  });
});

describe("notifications ownership (FR31 / EC-N2)", () => {
  it("a member sees only their own notifications", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = (await q(
        "select recipient_id from public.notifications",
      )) as { recipient_id: string }[];
      expect(rows.every((r) => r.recipient_id === MEMBER_A)).toBe(true);
    });
  });

  it("a member cannot mark someone else's notification read", async () => {
    // Seeded progress update notified the task creator (ADMIN). MEMBER_A
    // must not be able to touch it.
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q(
        `update public.notifications set read_at = now()
         where recipient_id = $1 returning id`,
        [ADMIN],
      );
      expect(rows).toHaveLength(0);
    });
  });

  it("a member cannot alter notification content (guard trigger)", async () => {
    const blocked = await asUser(client, ADMIN, (q) =>
      rejects(
        q(
          "update public.notifications set title = 'x' where recipient_id = $1",
          [ADMIN],
        ),
      ),
    );
    expect(blocked).toBe(true);
  });
});

describe("submit_progress_update RPC (ADR-3 / D3 / EC-T5,T6,P3)", () => {
  it("assignee can submit on own open task", async () => {
    await asUser(client, MEMBER_A, async (q) => {
      const rows = await q(
        "select public.submit_progress_update($1, $2, $3, $4) as id",
        [TASK_A1, "Made progress today.", 40, "IN_PROGRESS"],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("non-assignee cannot submit on another's task (EC-P3)", async () => {
    const blocked = await asUser(client, MEMBER_A, (q) =>
      rejects(
        q("select public.submit_progress_update($1, $2)", [
          TASK_B3,
          "not mine",
        ]),
      ),
    );
    expect(blocked).toBe(true);
  });

  it("rejects a disallowed status target (EC-T5)", async () => {
    const blocked = await asUser(client, MEMBER_A, (q) =>
      rejects(
        q("select public.submit_progress_update($1, $2, $3, $4)", [
          TASK_A1,
          "trying to cancel",
          null,
          "CANCELLED",
        ]),
      ),
    );
    expect(blocked).toBe(true);
  });

  it("rejects progress on a completed task (EC-T6)", async () => {
    const blocked = await asUser(client, MEMBER_B, (q) =>
      rejects(
        q("select public.submit_progress_update($1, $2)", [
          TASK_B4,
          "too late",
        ]),
      ),
    );
    expect(blocked).toBe(true);
  });

  it("rejects an out-of-range percent (EC-P1)", async () => {
    const blocked = await asUser(client, MEMBER_A, (q) =>
      rejects(
        q("select public.submit_progress_update($1, $2, $3)", [
          TASK_A1,
          "bad percent",
          150,
        ]),
      ),
    );
    expect(blocked).toBe(true);
  });
});
