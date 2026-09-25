import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
import path from "node:path";

const root = path.resolve(__dirname, "..");

// Integration tests read .env.test.local first, then .env.local. Both must
// point at a local Supabase stack; tests/fixtures/supabase.ts refuses any
// hosted URL (see docs/architecture.md).
config({ path: path.resolve(root, ".env.test.local"), override: false });
config({ path: path.resolve(root, ".env.local"), override: false });

// Unit tests must run on a fresh clone and in CI, where no env file exists.
// Modules like publicEnv validate on import, so give them local-only values.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.NEXT_PUBLIC_SITE_URL ||= "http://localhost:3000";
