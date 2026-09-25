// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRows } from "@scripts/db/fixture-rows";
import { as, createMigratedDb, type Db } from "./harness";

/**
 * Inserts every development-fixture row into the fully migrated schema, the
 * same way the restore script does through PostgREST (as the service role).
 * Auth users are created directly because PGlite has no GoTrue.
 */
async function insertAll(db: Db, table: string, rows: Record<string, unknown>[], conflict = "id") {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]!);
  for (const row of rows) {
    const values = cols.map((c) => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updates = cols.filter((c) => c !== conflict).map((c) => `${c} = excluded.${c}`).join(", ");
    await as(
      db,
      { role: "service_role" },
      (tx) => tx.query(`insert into ${table} (${cols.join(", ")}) values (${placeholders}) on conflict (${conflict}) do update set ${updates}`, values),
      { commit: true },
    );
  }
}

async function restore(db: Db) {
  const features = (await db.query<{ slug: string; id: string }>("select slug, id from features order by slug")).rows;
  const rows = buildFixtureRows(new Date(), features.map((f) => f.slug));
  for (const u of rows.users) {
    await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now()) on conflict (id) do nothing", [u.id, u.email]);
    if (u.role === "admin") await db.query("insert into user_roles (user_id, role) values ($1, 'admin') on conflict (user_id, role) do nothing", [u.id]);
  }
  await insertAll(db, "seller_profiles", rows.sellers);
  await insertAll(db, "properties", rows.properties);
  await insertAll(db, "property_images", rows.images.map(({ placeholder_seed: _s, ...r }) => r));
  const byslug = new Map(features.map((f) => [f.slug, f.id]));
  for (const pf of rows.propertyFeatures) {
    await db.query("insert into property_features (property_id, feature_id) values ($1, $2) on conflict do nothing", [pf.property_id, byslug.get(pf.feature_slug)]);
  }
  await insertAll(db, "open_houses", rows.openHouses);
  await insertAll(db, "open_house_rsvps", rows.rsvps);
  await insertAll(db, "seller_follows", rows.follows);
  await insertAll(db, "property_saves", rows.saves);
  await insertAll(db, "inquiries", rows.inquiries);
  await insertAll(db, "lead_activity", rows.leadActivity);
  await insertAll(db, "lead_notes", rows.leadNotes);
  await insertAll(db, "reports", rows.reports);
  return rows;
}

const count = async (db: Db, table: string) => Number((await db.query<{ n: number }>(`select count(*) n from ${table}`)).rows[0]!.n);

describe("development fixture restore against the migrated schema", () => {
  let db: Db;
  let rows: ReturnType<typeof buildFixtureRows>;

  beforeAll(async () => {
    db = await createMigratedDb();
    rows = await restore(db);
  }, 120_000);

  it("inserts every fixture row", async () => {
    expect(await count(db, "auth.users")).toBe(10);
    expect(await count(db, "seller_profiles")).toBe(6);
    expect(await count(db, "seller_entitlements")).toBe(6);
    expect(await count(db, "properties")).toBe(16);
    expect(await count(db, "property_images")).toBe(79);
    expect(await count(db, "open_houses")).toBe(3);
    expect(await count(db, "open_house_rsvps")).toBe(9);
    expect(await count(db, "inquiries")).toBe(4);
    expect(await count(db, "reports")).toBe(1);
  });

  it("is idempotent", async () => {
    await restore(db);
    expect(await count(db, "properties")).toBe(16);
    expect(await count(db, "property_images")).toBe(79);
    expect(await count(db, "open_house_rsvps")).toBe(9);
  });

  it("stores fixtures as real (non-demo) content", async () => {
    expect(await count(db, "properties where is_demo")).toBe(0);
    const visible = await as(db, { role: "anon" }, async (tx) => Number((await tx.query<{ n: number }>("select count(*) n from public_properties")).rows[0]!.n));
    // draft and paused listings stay private
    expect(visible).toBe(rows.properties.filter((p) => ["for_sale", "coming_soon", "under_contract", "sold"].includes(p.listing_status)).length);
  });

  it("gives the fixture admin admin access", async () => {
    const admin = rows.users.find((u) => u.role === "admin")!;
    const isAdmin = await as(db, { role: "authenticated", userId: admin.id }, async (tx) => (await tx.query<{ v: boolean }>("select is_admin() v")).rows[0]!.v);
    expect(isAdmin).toBe(true);
  });
});
