import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { assertLocalSupabase } from "@scripts/lib/targets";

function requireEnv(name: string): string {
  // Integration tests create and delete users and listings, so they may only
  // ever run against a local Supabase stack — never the hosted project.
  assertLocalSupabase(process.env);
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Integration tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (see tests/setup.ts / .env.local).`,
    );
  }
  return value;
}

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** A signed-in client for a freshly created, auto-confirmed test user. */
export async function signedInClient(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInWithPassword failed for ${email}: ${error.message}`);
  return client;
}

const TEST_TAG = "itest";
export function testEmail(label: string): string {
  return `${TEST_TAG}.${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.test`;
}
export const TEST_PASSWORD = "IntegrationTest123!";

export async function createTestUser(admin: SupabaseClient<Database>, email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`);
  return data.user.id;
}

export async function deleteTestUser(admin: SupabaseClient<Database>, userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

export async function createTestSeller(
  admin: SupabaseClient<Database>,
  opts: { userId: string; username: string; displayName?: string },
) {
  const { data, error } = await admin
    .from("seller_profiles")
    .insert({
      user_id: opts.userId,
      account_type: "individual",
      display_name: opts.displayName ?? opts.username,
      username: opts.username,
      city: "Buffalo",
      state: "NY",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createTestSeller failed: ${error?.message}`);
  return data.id;
}

export async function createTestProperty(
  admin: SupabaseClient<Database>,
  opts: {
    sellerId: string;
    addressVisibility?: "full" | "city_zip" | "city_only";
    listingStatus?: "draft" | "coming_soon" | "for_sale" | "paused" | "archived";
    moderationStatus?: "clear" | "flagged" | "hidden";
    slug?: string;
  },
) {
  const { data, error } = await admin
    .from("properties")
    .insert({
      seller_id: opts.sellerId,
      address_line_1: "999 Hidden Test Lane",
      address_line_2: "Unit 7",
      city: "Buffalo",
      state: "NY",
      postal_code: "14201",
      address_visibility: opts.addressVisibility ?? "full",
      listing_status: opts.listingStatus ?? "for_sale",
      moderation_status: opts.moderationStatus ?? "clear",
      asking_price_cents: 30_000_000,
      pricing_type: "asking_price",
      title: "Integration Test Property",
      slug: opts.slug,
      published_at: opts.listingStatus === "draft" ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createTestProperty failed: ${error?.message}`);
  return data.id;
}

export async function cleanupSeller(admin: SupabaseClient<Database>, sellerId: string) {
  await admin.from("properties").delete().eq("seller_id", sellerId);
  await admin.from("seller_profiles").delete().eq("id", sellerId);
}
