import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getServerEnv } from "@/config/env";
import { isFixtureMode } from "@/config/runtime";
import { PreviewReadOnlyError } from "@/lib/preview-fixtures/client";

/**
 * Bypasses RLS entirely. Only for: guest (unauthenticated) writes that have
 * already been validated server-side (inquiries, RSVPs, reports),
 * Supabase Auth admin operations (auth.admin.*), the image-processing
 * route writing to the public bucket, and cross-user notification
 * fan-out. Never construct this client-side — `server-only` makes that a
 * build error, and SUPABASE_SERVICE_ROLE_KEY is never read outside
 * src/config/env.ts.
 */
export function createAdminClient() {
  // Privileged access is never available on preview deployments.
  if (isFixtureMode) throw new PreviewReadOnlyError();
  const env = getServerEnv();
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
