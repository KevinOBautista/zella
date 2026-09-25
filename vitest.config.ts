import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const dirname = import.meta.dirname;

// Default suite: unit tests plus database tests against an embedded Postgres
// (tests/db). Tests that talk to a real Supabase project live in
// tests/integration and run only through vitest.integration.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/db/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "@tests": path.resolve(dirname, "./tests"),
      "@scripts": path.resolve(dirname, "./scripts"),
    },
  },
});
