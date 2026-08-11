import { defineConfig } from "vitest/config";

// RLS/authorization suite — requires a running local Supabase DB (CI schema
// job). Kept separate from the default unit config so `npm test` stays
// DB-free and fast on machines without Docker.
export default defineConfig({
  test: {
    include: ["tests/rls/**/*.test.ts"],
    environment: "node",
    fileParallelism: false, // single shared connection, serialized txns
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
