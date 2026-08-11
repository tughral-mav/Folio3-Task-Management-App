import { test, expect } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

// Unauthenticated surface — no session injected.
test.use({ storageState: { cookies: [], origins: [] } });

test("login offers Google only — no signup or password fields (FR1)", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /continue with google/i }),
  ).toBeVisible();
  // No form inputs at all ⇒ no email/password/username/registration form.
  await expect(page.locator("input")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("protected routes redirect unauthenticated users to /login (proxy guard)", async ({
  page,
}) => {
  for (const route of ["/", "/admin", "/my", "/notifications", "/admin/tasks"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("access-denied page renders its explanation", async ({ page }) => {
  await page.goto("/access-denied?reason=domain");
  await expect(
    page.getByRole("heading", { name: /access denied/i }),
  ).toBeVisible();
  await expect(page.getByText(/folio3/i).first()).toBeVisible();
});
