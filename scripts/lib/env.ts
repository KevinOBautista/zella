import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import type { Env } from "./targets";

export const ROOT = path.resolve(import.meta.dirname, "../..");

/**
 * Operator credentials live in a file Next.js never loads automatically
 * (default: .env.production-ops.local, gitignored). Values are returned as a
 * plain object and never written into process.env, so they cannot leak into
 * child processes or a build.
 */
export const DEFAULT_OPERATOR_ENV_FILE = ".env.production-ops.local";

export function envFileFlag(argv: string[]): string | undefined {
  return argv.find((a) => a.startsWith("--env-file="))?.slice("--env-file=".length);
}

export function loadEnvFile(file: string): Env {
  const full = path.resolve(ROOT, file);
  if (!existsSync(full)) {
    throw new Error(`Env file ${file} was not found. Create it from .env.production-ops.example.`);
  }
  // Deployment markers from the real environment still apply.
  const { VERCEL, VERCEL_ENV, CI, NOW_BUILDER } = process.env;
  return { ...parse(readFileSync(full)), VERCEL, VERCEL_ENV, CI, NOW_BUILDER };
}
