/**
 * Scans a finished `next build` for things that must never ship.
 *
 *   npm run check:bundle -- [--env-file=.env.local] [--preview]
 *
 * Always: the browser bundle (.next/static) must not contain server secrets
 * (values read from the env file), secret variable names, development
 * fixture identities, or operator-only RPC names.
 * --preview: additionally, no part of the build (client or server) may
 * contain the Supabase project URL, host or anon key.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import { FIXTURE_SELLERS, FIXTURE_USERS } from "../supabase/fixtures/dev/data";

const ROOT = path.resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const envFile = argv.find((a) => a.startsWith("--env-file="))?.split("=")[1];
const preview = argv.includes("--preview");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const env = envFile ? parse(readFileSync(path.resolve(ROOT, envFile))) : {};
const secretValues = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_PASSWORD", "RATE_LIMIT_IP_SALT", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "SEED_USER_PASSWORD"]
  .map((k) => env[k])
  .filter((v): v is string => Boolean(v && v.length >= 8));

const clientForbidden: [string, string][] = [
  ...secretValues.map((v) => ["secret value", v] as [string, string]),
  ["secret name", "SUPABASE_SERVICE_ROLE_KEY"],
  ["secret name", "RATE_LIMIT_IP_SALT"],
  ["fixture domain", "dev.zella.test"],
  ...FIXTURE_SELLERS.map((s) => ["fixture seller", s.username] as [string, string]),
  ...FIXTURE_USERS.map((u) => ["fixture account", u.email] as [string, string]),
  ["operator RPC", "admin_apply_demo_dataset"],
  ["operator RPC", "admin_remove_dev_fixtures"],
  ["operator table", "demo_storage_ledger"],
];

const everywhereForbidden: [string, string][] = [];
if (preview) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    everywhereForbidden.push(["Supabase URL", url], ["Supabase host", new URL(url).host]);
  }
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY) everywhereForbidden.push(["Supabase anon key", env.NEXT_PUBLIC_SUPABASE_ANON_KEY]);
  everywhereForbidden.push(...secretValues.map((v) => ["secret value", v] as [string, string]));
}

const nextDir = path.join(ROOT, ".next");
if (!existsSync(nextDir)) {
  console.error("No .next directory. Run `npm run build` first.");
  process.exit(1);
}

const problems: string[] = [];
const scan = (files: string[], rules: [string, string][]) => {
  for (const file of files) {
    if (!/\.(js|mjs|cjs|json|html|rsc|txt|map|css)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const [label, needle] of rules) {
      if (text.includes(needle)) problems.push(`${label} found in ${path.relative(ROOT, file)}`);
    }
  }
};

scan(walk(path.join(nextDir, "static")), clientForbidden);
if (everywhereForbidden.length) {
  scan(
    walk(nextDir).filter((f) => !f.includes(`${path.sep}cache${path.sep}`) && !f.includes(`${path.sep}dev${path.sep}`)),
    everywhereForbidden,
  );
}

if (problems.length) {
  // Never print the secret itself.
  console.error(`Bundle check FAILED (${problems.length}):\n- ${[...new Set(problems)].join("\n- ")}`);
  process.exit(1);
}
console.log(`Bundle check passed${preview ? " (preview isolation)" : ""}: ${secretValues.length} secret values and ${clientForbidden.length - secretValues.length} markers absent from the client bundle.`);
