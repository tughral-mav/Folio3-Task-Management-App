import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Unit tests live next to code (src/**) and in tests/unit; integration
    // and RLS suites (tests/integration, tests/rls) require a running local
    // Supabase stack and are included via the same runner in CI.
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
