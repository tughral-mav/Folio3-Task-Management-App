import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const ADMIN_STATE = path.join(__dirname, ".auth/admin.json");
export const MEMBER_STATE = path.join(__dirname, ".auth/member.json");

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Seeded task assigned to member A (supabase/seed.sql) — "Prepare Q3 report".
export const MEMBER_TASK = "00000000-0000-4000-9000-000000000001";
// Seeded task assigned to member B — used for the IDOR check: member A must
// not be able to open it.
export const OTHER_MEMBERS_TASK = "00000000-0000-4000-9000-000000000003";

/**
 * The responsive TaskTable renders both a mobile card list and a desktop
 * table in the DOM (CSS toggles which is shown), so a task title appears
 * twice. This resolves to the copy actually visible at the current viewport.
 */
export function visibleTask(page: Page, name: string | RegExp) {
  return page.getByText(name).filter({ visible: true }).first();
}

export function visibleTaskLink(page: Page, name: string | RegExp) {
  return page
    .getByRole("link", { name })
    .filter({ visible: true })
    .first();
}

/** NFR1/Test 13: the page must never scroll horizontally. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(1);
}

/** Pick a team member in the searchable assignee combobox (filter + click). */
export async function selectAssignee(page: Page, name: string) {
  const box = page.getByLabel("Assignee");
  await box.click();
  await box.fill(name);
  await page
    .getByRole("option", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
    .first()
    .click();
}

/** Reads the unread count off the notification bell's accessible label. */
export async function unreadBadgeCount(page: Page): Promise<number> {
  const bell = page.getByRole("link", { name: /notifications/i }).first();
  const label = (await bell.getAttribute("aria-label")) ?? "";
  return Number(label.match(/(\d+)\s*unread/)?.[1] ?? "0");
}
