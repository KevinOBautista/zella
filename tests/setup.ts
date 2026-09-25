import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
import path from "node:path";

const root = path.resolve(__dirname, "..");

// Integration tests read .env.test.local first, then .env.local. Both must
// point at a local Supabase stack; tests/fixtures/supabase.ts refuses any
// hosted URL (see docs/architecture.md).
config({ path: path.resolve(root, ".env.test.local"), override: false });
config({ path: path.resolve(root, ".env.local"), override: false });
