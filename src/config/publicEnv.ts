import { z } from "zod";

/**
 * Public environment schema — safe to import from client components.
 * Everything here is a NEXT_PUBLIC_ value already shipped to the browser.
 * In fixture mode (preview deployments) Supabase is not configured at all.
 */
const fixtureMode = process.env.NEXT_PUBLIC_DATA_MODE === "fixtures";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: fixtureMode ? z.string().optional() : z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: fixtureMode ? z.string().optional() : z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: fixtureMode ? undefined : process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: fixtureMode ? undefined : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: fixtureMode ? undefined : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
