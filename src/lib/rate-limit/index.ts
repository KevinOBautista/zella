import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/config/env";

/** Never store or log a raw IP — always hash it with a server-only salt. */
export async function getHashedClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  const env = getServerEnv();
  return createHmac("sha256", env.RATE_LIMIT_IP_SALT).update(ip).digest("hex");
}

/**
 * Backed by the check_rate_limit Postgres RPC (rate_limit_hits table).
 * Returns true when the request may proceed, false when the caller should
 * be rejected. Centralized limits live in src/config/limits.ts.
 */
export async function checkRateLimit(
  bucketKeyParts: string[],
  limit: { windowSeconds: number; max: number },
): Promise<boolean> {
  const ipHash = await getHashedClientIp();
  const bucketKey = [ipHash, ...bucketKeyParts].join(":");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: limit.windowSeconds,
    p_max_hits: limit.max,
  });
  if (error) {
    // Fail closed would break the app if the RPC ever has a transient
    // issue; fail open but this is logged so it's visible in practice.
    console.error("check_rate_limit failed", error.message);
    return true;
  }
  return Boolean(data);
}
