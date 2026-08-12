import { test, expect } from "@playwright/test";
import { ADMIN_STATE, BASE_URL, MEMBER_STATE, MEMBER_TASK } from "./helpers";

/**
 * Epic 8 / FR40: a member can add MULTIPLE progress updates, shown grouped by
 * date to the admin. Submits two updates as the member (own browser context),
 * then verifies the admin sees both under a dated group.
 */
test("member adds multiple dated updates; admin sees them grouped by date", async ({
  browser,
}) => {
  const stamp = Date.now();
  const first = `First update ${stamp}`;
  const second = `Second update ${stamp}`;

  // --- member submits two progress updates on their assigned task ---
  const memberCtx = await browser.newContext({
    storageState: MEMBER_STATE,
    baseURL: BASE_URL,
  });
  const memberPage = await memberCtx.newPage();
  for (const body of [first, second]) {
    await memberPage.goto(`/my/tasks/${MEMBER_TASK}`);
    await memberPage.getByLabel(/what have you completed/i).fill(body);
    await memberPage.getByRole("button", { name: /submit update/i }).click();
    await expect(memberPage.getByText(/progress submitted/i)).toBeVisible();
    await expect(memberPage.getByText(body)).toBeVisible();
  }
  await memberCtx.close();

  // --- admin sees both updates, under a dated group header ---
  const adminCtx = await browser.newContext({
    storageState: ADMIN_STATE,
    baseURL: BASE_URL,
  });
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(`/admin/tasks/${MEMBER_TASK}`);
  await expect(adminPage.getByText(first)).toBeVisible();
  await expect(adminPage.getByText(second)).toBeVisible();
  // FR40: updates are organised under a per-date section.
  await expect(
    adminPage.getByRole("region", { name: /updates on/i }).first(),
  ).toBeVisible();
  await adminCtx.close();
});
