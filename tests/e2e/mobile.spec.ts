import { test } from "@playwright/test";
import { MEMBER_STATE, expectNoHorizontalOverflow } from "./helpers";

// Test 13: representative viewports (the `mobile` project uses a Pixel 7).
// Every authenticated member surface must fit without horizontal scrolling.
// These assertions also run under the `desktop` project as a baseline.
test.use({ storageState: MEMBER_STATE });

for (const route of ["/my", "/my/tasks", "/notifications", "/my/activity"]) {
  test(`no horizontal overflow at ${route}`, async ({ page }) => {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  });
}
