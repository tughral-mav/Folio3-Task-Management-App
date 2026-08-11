import { test, expect } from "@playwright/test";
import {
  MEMBER_STATE,
  unreadBadgeCount,
  visibleTask,
  visibleTaskLink,
} from "./helpers";

test.use({ storageState: MEMBER_STATE });

test("member sees their own assigned tasks, not others' (FR14)", async ({
  page,
}) => {
  await page.goto("/my/tasks");
  // Seeded tasks assigned to member A.
  await expect(visibleTask(page, "Prepare Q3 report")).toBeVisible();
  // Seeded task assigned to member B must not appear at all.
  await expect(page.getByText("Update onboarding docs")).toHaveCount(0);
});

test("member submits a progress update (Test 7)", async ({ page }) => {
  await page.goto("/my/tasks");
  await visibleTaskLink(page, /prepare q3 report/i).click();

  await page
    .getByLabel(/what have you completed/i)
    .fill("Drafted the first two sections.");
  await page.getByLabel(/progress %/i).fill("40");
  await page.getByRole("button", { name: /submit update/i }).click();

  await expect(page.getByText(/progress submitted/i)).toBeVisible();
  // The immutable update now appears in the list.
  await expect(
    page.getByText("Drafted the first two sections."),
  ).toBeVisible();
});

test("opening a notification marks it read and drops the badge (Test 9)", async ({
  page,
}) => {
  await page.goto("/notifications");
  const before = await unreadBadgeCount(page);
  test.skip(before === 0, "no unread notifications to exercise");

  // Open the first notification item (list buttons live in the <ol>; this
  // deliberately avoids the header "Mark all as read" button).
  await page.locator("ol li button").first().click();

  // After navigation the unread badge has decreased by at least one.
  await expect
    .poll(async () => unreadBadgeCount(page))
    .toBeLessThanOrEqual(before - 1);
});
