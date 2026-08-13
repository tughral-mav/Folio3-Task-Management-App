import { test, expect } from "@playwright/test";
import { MEMBER_STATE, OTHER_MEMBERS_TASK } from "./helpers";

// Authorization enforced by the server/RLS — these verify the UI layer of
// Tests 10 and 12 (the DB layer is covered by the RLS suite).
test.use({ storageState: MEMBER_STATE });

test("member is bounced from admin-only surfaces (UI)", async ({ page }) => {
  // Admin dashboard, admin board create, and insights stay admin-only even
  // though members can now create tasks via their own /my/tasks/new (v0.4).
  for (const route of ["/admin", "/admin/tasks/new", "/admin/insights"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/my$/);
  }
});

test("member cannot open another user's task (Test 10, UI / IDOR)", async ({
  page,
}) => {
  await page.goto(`/my/tasks/${OTHER_MEMBERS_TASK}`);
  // RLS returns nothing → the app renders its not-found state.
  await expect(page.getByText(/not available/i)).toBeVisible();
});
