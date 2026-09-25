/**
 * Where the app reads data from.
 *
 * - "supabase": the configured Supabase project (local dev, production).
 * - "fixtures": a read-only, in-memory copy of the public demo dataset with
 *   no authentication and no writes. Forced on Vercel preview deployments so
 *   a preview can never touch production data, auth or storage
 *   (see docs/architecture.md).
 *
 * next.config.ts resolves the mode at build time and inlines it as
 * NEXT_PUBLIC_DATA_MODE, so server and browser code agree.
 */
export type DataMode = "supabase" | "fixtures";

export function resolveDataMode(env: Record<string, string | undefined>): DataMode {
  if (env.VERCEL_ENV === "preview") return "fixtures";
  return env.NEXT_PUBLIC_DATA_MODE === "fixtures" ? "fixtures" : "supabase";
}

function asOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

/**
 * The canonical site URL. An empty or invalid NEXT_PUBLIC_SITE_URL counts as
 * unset (Vercel lets a variable exist with a blank value), falling back to the
 * project's production domain and then the deployment URL. next.config.ts
 * inlines the result as NEXT_PUBLIC_SITE_URL.
 */
export function resolveSiteUrl(env: Record<string, string | undefined>): string | undefined {
  return (
    asOrigin(env.NEXT_PUBLIC_SITE_URL) ??
    asOrigin(env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`) ??
    asOrigin(env.VERCEL_URL && `https://${env.VERCEL_URL}`)
  );
}

export const DATA_MODE: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === "fixtures" ? "fixtures" : "supabase";

export const isFixtureMode = DATA_MODE === "fixtures";

export const PREVIEW_READ_ONLY_MESSAGE =
  "This preview deployment uses sample data only. Sign-in, submissions and uploads are turned off.";
