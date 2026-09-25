/**
 * Grants the admin role to an existing account. There is intentionally no UI
 * for this; it is an out-of-band operator action.
 *
 *   npm run admin:grant -- --target=production --user-id=<id> [--confirm-project=<ref> --apply]
 *   npm run admin:grant -- verify --target=production --user-id=<id>
 *
 * Dry run unless --apply is passed with a matching --confirm-project.
 */
import { DEFAULT_OPERATOR_ENV_FILE, envFileFlag, loadEnvFile } from "../lib/env";
import { parseProductionTarget, redact, TargetError, type Env } from "../lib/targets";
import { createServiceClient } from "../lib/supabase-backend";

function flag(argv: string[], name: string) {
  return argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main(argv: string[]) {
  const env: Env = loadEnvFile(envFileFlag(argv) ?? DEFAULT_OPERATOR_ENV_FILE);
  const target = parseProductionTarget(argv, env);
  const db = createServiceClient(target.url, env.SUPABASE_SERVICE_ROLE_KEY!);
  console.log(`[${target.apply ? "APPLY" : "DRY RUN"}] grant-admin → project ${target.projectRef}\n`);

  const verifyOnly = argv.includes("verify");
  const userId = flag(argv, "user-id");
  if (!userId) throw new TargetError("--user-id=<auth user id> is required.");
  const user = await db.auth.admin.getUserById(userId);
  if (user.error || !user.data.user) throw new Error(`user ${userId} not found`);
  const roles = await db.from("user_roles").select("role").eq("user_id", userId);
  if (roles.error) throw new Error(roles.error.message);
  const has = (roles.data ?? []).some((r) => r.role === "admin");
  console.log(`Account @${(user.data.user.email ?? "").split("@")[1]} · roles: ${(roles.data ?? []).map((r) => r.role).join(", ") || "none"}`);
  if (verifyOnly || has) {
    console.log(has ? "Admin role is present. Sign in as this account and confirm /admin loads." : "Admin role is NOT present.");
    return;
  }
  if (!target.apply) {
    console.log("Dry run: would add the admin role to this account.");
    return;
  }
  const res = await db.from("user_roles").insert({ user_id: userId, role: "admin" });
  if (res.error) throw new Error(res.error.message);
  console.log("Admin role granted. Verify with `npm run admin:grant -- verify …`, then sign in and open /admin.");
}

main(process.argv.slice(2)).catch((err: unknown) => {
  let env: Env = {};
  try {
    env = loadEnvFile(envFileFlag(process.argv) ?? DEFAULT_OPERATOR_ENV_FILE);
  } catch {
    // nothing to redact
  }
  console.error(redact(err instanceof Error ? err.message : String(err), env));
  process.exitCode = 1;
});
