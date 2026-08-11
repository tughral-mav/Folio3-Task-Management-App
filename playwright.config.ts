import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// E2E suite per docs/testing/test-strategy.md: runs against a local build +
// local Supabase stack with injected sessions (no live Google in CI). Desktop
// + mobile viewports give Test 13 coverage across every authenticated flow.
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: path.join(__dirname, "tests/e2e/global-setup.ts"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
