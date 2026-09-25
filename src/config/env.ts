import "server-only";
import { z } from "zod";

/**
 * Server-only environment schema. Import `serverEnv` only from server
 * code (route handlers, server actions, RSC). Importing this module from a
 * client component fails at build time because of the `server-only` guard
 * above, which is exactly the point: SUPABASE_SERVICE_ROLE_KEY and other
 * secrets here must never reach the browser bundle.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  RATE_LIMIT_IP_SALT: z.string().min(8),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("Zella <notifications@zella.example>"),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

let cached: z.infer<typeof serverSchema> | undefined;

export function getServerEnv() {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${message}`);
  }
  cached = parsed.data;
  return cached;
}
