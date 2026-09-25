/**
 * Restores the development fixtures into a LOCAL Supabase stack.
 *
 *   supabase start && supabase db reset
 *   npm run fixtures:restore                # uses .env.local
 *   npm run fixtures:restore -- --env-file=.env.development.local
 *
 * Refuses any hosted project, Vercel and CI. Idempotent: rows use
 * deterministic ids and are upserted. Fixture account passwords come from
 * SEED_USER_PASSWORD, or a random one is generated and printed once.
 */
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { envFileFlag, loadEnvFile } from "../lib/env";
import { assertLocalSupabase, TargetError } from "../lib/targets";
import { createServiceClient } from "../lib/supabase-backend";
import { buildFixtureRows } from "./fixture-rows";

async function placeholderImage(seed: string): Promise<Buffer> {
  let raw: Buffer;
  try {
    const res = await fetch(`https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/1067`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    raw = Buffer.from(await res.arrayBuffer());
  } catch {
    // Offline: a flat color derived from the seed keeps restores working.
    let h = 0;
    for (const ch of seed) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
    const hue = Math.abs(h) % 360;
    raw = await sharp({ create: { width: 1600, height: 1067, channels: 3, background: `hsl(${hue}, 35%, 72%)` } }).jpeg().toBuffer();
  }
  return sharp(raw).resize({ width: 2000, height: 1334, fit: "cover" }).webp({ quality: 82 }).toBuffer();
}

function must<T>(label: string, res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error || res.data == null) throw new Error(`${label}: ${res.error?.message ?? "no data"}`);
  return res.data as NonNullable<T>;
}

function check(label: string, res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const env = loadEnvFile(envFileFlag(argv) ?? ".env.local");
  const { url } = assertLocalSupabase(env);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new TargetError("SUPABASE_SERVICE_ROLE_KEY (the local stack's service key from `supabase status`) is required.");
  const db = createServiceClient(url, env.SUPABASE_SERVICE_ROLE_KEY);
  const password = env.SEED_USER_PASSWORD || randomBytes(12).toString("base64url");

  const features = must("read features", await db.from("features").select("slug").order("slug"));
  const rows = buildFixtureRows(new Date(), (features ?? []).map((f) => f.slug as string));
  console.log(`Restoring development fixtures into ${url}\n`);

  const listed = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listed.error) throw new Error(`list users: ${listed.error.message}`);
  const existing = listed.data;
  for (const u of rows.users) {
    const byEmail = existing.users.find((x) => x.email === u.email);
    if (byEmail && byEmail.id !== u.id) throw new Error(`${u.email} already exists with a different id; reset the local database first.`);
    if (!byEmail) {
      const created = await db.auth.admin.createUser({ id: u.id, email: u.email, password, email_confirm: true });
      if (created.error) throw new Error(`create ${u.email}: ${created.error.message}`);
    }
    if (u.role === "admin") check("grant admin", await db.from("user_roles").upsert({ user_id: u.id, role: "admin" }, { onConflict: "user_id,role" }));
  }
  console.log(`✓ ${rows.users.length} fixture accounts`);

  check("sellers", await db.from("seller_profiles").upsert(rows.sellers, { onConflict: "id" }));
  check("properties", await db.from("properties").upsert(rows.properties, { onConflict: "id" }));
  console.log(`✓ ${rows.sellers.length} sellers, ${rows.properties.length} properties`);

  for (const img of rows.images) {
    const { placeholder_seed, ...row } = img;
    const bytes = await placeholderImage(placeholder_seed);
    check(`upload ${row.storage_path}`, await db.storage.from("property-images").upload(row.storage_path, bytes, { contentType: "image/webp", upsert: true }));
    check("image row", await db.from("property_images").upsert(row, { onConflict: "id" }));
  }
  console.log(`✓ ${rows.images.length} placeholder photos`);

  const featureIds = new Map(
    (must("feature ids", await db.from("features").select("id, slug")) ?? []).map((f) => [f.slug as string, f.id as string]),
  );
  check(
    "property features",
    await db.from("property_features").upsert(
      rows.propertyFeatures.map((pf) => ({ property_id: pf.property_id, feature_id: featureIds.get(pf.feature_slug)! })),
      { onConflict: "property_id,feature_id" },
    ),
  );

  check("open houses", await db.from("open_houses").upsert(rows.openHouses, { onConflict: "id" }));
  check("rsvps", await db.from("open_house_rsvps").upsert(rows.rsvps, { onConflict: "id" }));
  check("follows", await db.from("seller_follows").upsert(rows.follows, { onConflict: "id" }));
  check("saves", await db.from("property_saves").upsert(rows.saves, { onConflict: "id" }));
  check("inquiries", await db.from("inquiries").upsert(rows.inquiries, { onConflict: "id" }));
  check("lead activity", await db.from("lead_activity").upsert(rows.leadActivity, { onConflict: "id" }));
  check("lead notes", await db.from("lead_notes").upsert(rows.leadNotes, { onConflict: "id" }));
  check("reports", await db.from("reports").upsert(rows.reports, { onConflict: "id" }));
  console.log(`✓ ${rows.openHouses.length} open houses, ${rows.rsvps.length} RSVPs, ${rows.inquiries.length} inquiries, follows, saves, a lead note and a report`);

  console.log("\nFixture accounts (local only):");
  for (const u of rows.users) console.log(`  ${u.role.padEnd(6)} ${u.email}`);
  console.log(env.SEED_USER_PASSWORD ? "Password: SEED_USER_PASSWORD from your env file." : `Generated password for this restore: ${password}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
