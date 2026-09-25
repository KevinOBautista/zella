/**
 * Target guards shared by every data script. Development fixtures may only
 * touch a local Supabase stack; production demo and cleanup commands need an
 * explicit production target, dry-run by default, and only mutate with both
 * --apply and --confirm-project=<ref>. Nothing here may run on Vercel or CI.
 */

export type Env = Record<string, string | undefined>;

export class TargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TargetError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

export function isLocalSupabaseUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

const DEPLOYMENT_MARKERS = ["VERCEL", "VERCEL_ENV", "CI", "NOW_BUILDER"];

export function assertNotInDeployment(env: Env): void {
  const marker = DEPLOYMENT_MARKERS.find((key) => env[key]);
  if (marker) {
    throw new TargetError(`Refusing to run inside a deployment or CI environment (${marker} is set). Data scripts are operator-only.`);
  }
}

export function assertLocalSupabase(env: Env): { url: string } {
  assertNotInDeployment(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!isLocalSupabaseUrl(url)) {
    throw new TargetError(
      "Development fixtures can only be restored into a local Supabase stack (localhost / 127.0.0.1). " +
        "NEXT_PUBLIC_SUPABASE_URL points somewhere else, so nothing was changed.",
    );
  }
  return { url };
}

export type ProductionTarget = { url: string; projectRef: string; apply: boolean };

function flag(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

export function parseProductionTarget(argv: string[], env: Env): ProductionTarget {
  assertNotInDeployment(env);
  if (flag(argv, "target") !== "production") {
    throw new TargetError("This command only operates on production and needs an explicit --target=production.");
  }
  const projectRef = env.SUPABASE_PROJECT_REF ?? "";
  if (!projectRef) throw new TargetError("SUPABASE_PROJECT_REF is not set in the operator env file.");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new TargetError("SUPABASE_SERVICE_ROLE_KEY is not set in the operator env file.");

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // handled below
  }
  if (host !== `${projectRef}.supabase.co`) {
    throw new TargetError(`NEXT_PUBLIC_SUPABASE_URL does not match SUPABASE_PROJECT_REF (${projectRef}).`);
  }

  const apply = argv.includes("--apply");
  if (apply && flag(argv, "confirm-project") !== projectRef) {
    throw new TargetError(`Applying changes requires --confirm-project=${projectRef}.`);
  }
  return { url, projectRef, apply };
}

/** Strips secret values from text before it is printed or written to a log. */
export function redact(text: string, env: Env): string {
  const secrets = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_PASSWORD", "SEED_USER_PASSWORD", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY"]
    .map((key) => env[key])
    .filter((v): v is string => Boolean(v && v.length >= 6));
  return secrets.reduce((out, secret) => out.split(secret).join("[redacted]"), text);
}
