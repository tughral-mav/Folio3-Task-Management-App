import { test, expect } from "@playwright/test";
import {
  ADMIN_STATE,
  expectNoHorizontalOverflow,
  visibleTask,
} from "./helpers";

test.use({ storageState: ADMIN_STATE });

test("admin lands on the Admin Dashboard with stat cards", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: /admin dashboard/i }),
  ).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("admin creates and assigns a task (Test 6)", async ({ page }, testInfo) => {
  const title = `E2E ${testInfo.project.name} ${Date.now()}`;

  await page.goto("/admin/tasks/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Created by the Playwright suite.");
  await page.getByLabel("Assignee").selectOption({ label: "Seed Member A" });
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Due date").fill("2026-12-31");
  await page.getByRole("button", { name: /create task/i }).click();

  // Redirects to the new task's detail page.
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Seed Member A").first()).toBeVisible();

  // And it is now findable in the global task list.
  await page.goto("/admin/tasks");
  await expect(visibleTask(page, title)).toBeVisible();
});
