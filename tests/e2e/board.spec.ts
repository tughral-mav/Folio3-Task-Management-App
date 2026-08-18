import { test, expect } from "@playwright/test";
import {
  ADMIN_STATE,
  MEMBER_STATE,
  expectNoHorizontalOverflow,
  selectAssignee,
} from "./helpers";

// Epic 8 (FR37–FR39): Trello-style board.
test.describe("admin board", () => {
  test.use({ storageState: ADMIN_STATE });

  test("renders status columns", async ({ page }) => {
    await page.goto("/admin/board");
    await expect(page.getByRole("heading", { name: "Board" })).toBeVisible();
    for (const col of ["To do", "In progress", "Blocked", "Completed"]) {
      await expect(
        page.getByRole("region", { name: col }).first(),
      ).toBeVisible();
    }
  });

  test("board page has no horizontal overflow (NFR1/Test 13)", async ({
    page,
  }) => {
    await page.goto("/admin/board");
    await expectNoHorizontalOverflow(page);
  });

  test("admin moves a task to a new status via the card control (FR38)", async ({
    page,
  }) => {
    // Create a fresh task so the move is deterministic.
    const title = `Board move ${Date.now()}`;
    await page.goto("/admin/tasks/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Assignee").selectOption({ label: "Seed Member A" });
    await page.getByLabel("Priority").selectOption("MEDIUM");
    await page.getByLabel("Due date").fill("2026-12-31");
    await page.getByRole("button", { name: /create task/i }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.goto("/admin/board");
    const statusSelect = page.getByLabel(`Status of ${title}`);
    await expect(statusSelect).toHaveValue("TODO");
    await statusSelect.selectOption("IN_PROGRESS");
    // Let the server action + refresh settle before navigating away.
    await page.waitForLoadState("networkidle");

    // Persisted: reload and the card is In progress.
    await page.goto("/admin/board");
    await expect(page.getByLabel(`Status of ${title}`)).toHaveValue(
      "IN_PROGRESS",
    );
  });

  test("admin adds a card via the inline composer (Trello quick-add)", async ({
    page,
  }, testInfo) => {
    // The composer interaction isn't viewport-specific; verify it on desktop
    // (mobile layout is covered by the no-overflow tests). Avoids flaky
    // clicks in the narrow horizontally-scrolling board on mobile.
    test.skip(
      testInfo.project.name !== "desktop",
      "composer verified on desktop",
    );

    const title = `Quick card ${Date.now()}`;
    await page.goto("/admin/board");
    const todo = page.getByRole("region", { name: "To do" });
    await todo.getByRole("button", { name: /add a card/i }).click();
    await page.getByPlaceholder(/enter a title for this card/i).fill(title);
    await selectAssignee(page, "Seed Member A");
    await page.getByLabel("Due date").fill("2026-12-31");
    await page.getByRole("button", { name: /^add card$/i }).click();
    // Assert on the card's title link (the status-select label also contains
    // the title text, so getByText would match two nodes).
    await expect(todo.getByRole("link", { name: title })).toBeVisible();
  });
});

test.describe("member board", () => {
  test.use({ storageState: MEMBER_STATE });

  test("is read-only (no status controls) and shows own tasks", async ({
    page,
  }) => {
    await page.goto("/my/board");
    await expect(page.getByRole("heading", { name: "My Board" })).toBeVisible();
    await expect(page.getByText("Prepare Q3 report").first()).toBeVisible();
    // No status <select> exists on the member board.
    await expect(page.locator("select")).toHaveCount(0);
  });

  test("member board has no horizontal overflow (NFR1/Test 13)", async ({
    page,
  }) => {
    await page.goto("/my/board");
    await expectNoHorizontalOverflow(page);
  });
});
