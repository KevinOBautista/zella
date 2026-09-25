import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Integration tests need a real Supabase stack (Auth, PostgREST, Storage).
// tests/fixtures/supabase.ts refuses anything but a local stack
// (`supabase start`), so these never touch the hosted production project.
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["tests/integration/**/*.test.{ts,tsx}"],
      environment: "node",
      fileParallelism: false,
    },
  }),
);
