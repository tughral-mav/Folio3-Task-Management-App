import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const ADMIN_STATE = path.join(__dirname, ".auth/admin.json");
export const MEMBER_STATE = path.join(__dirname, ".auth/member.json");

// Seeded task assigned to member B (supabase/seed.sql) — used for the IDOR
// check: member A must not be able to open it.
export const OTHER_MEMBERS_TASK = "00000000-0000-4000-9000-000000000003";

/** NFR1/Test 13: the page must never scroll horizontally. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(1);
}

/** Reads the unread count off the notification bell's accessible label. */
export async function unreadBadgeCount(page: Page): Promise<number> {
  const bell = page.getByRole("link", { name: /notifications/i }).first();
  const label = (await bell.getAttribute("aria-label")) ?? "";
  return Number(label.match(/(\d+)\s*unread/)?.[1] ?? "0");
}
