import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { publicEnv } from "@/config/publicEnv";
import { isFixtureMode } from "@/config/runtime";
import { createFixtureClient } from "@/lib/preview-fixtures/client";
import fixtureData from "@/lib/preview-fixtures/generated.json";
import type { FixtureData } from "@/lib/preview-fixtures/types";

/**
 * The RLS-enforced client for the current request, bound to the visitor's
 * own session cookie. Use this for everything a signed-in user or seller
 * does to their own data — it's what makes our RLS policies (is_own_seller,
 * auth.uid() = user_id, …) actually apply, rather than merely existing on
 * paper. Only reach for the admin client (lib/supabase/admin.ts) for guest
 * writes, cross-user fan-out, or Supabase Auth admin operations.
 */
export async function createClient() {
  // Preview deployments never talk to Supabase: reads come from the public
  // demo fixtures and there is no session (see src/config/runtime.ts).
  if (isFixtureMode) {
    return createFixtureClient(fixtureData as FixtureData) as unknown as ReturnType<typeof createServerClient<Database>>;
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — the
            // proxy (proxy.ts) refreshes the session on the next request.
          }
        },
      },
    },
  );
}
