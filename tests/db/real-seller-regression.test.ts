// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { as, createMigratedDb, createRealSeller, createUser, type Db } from "./harness";
import { TEST_DATASET, demoPayload } from "./demo-payload";

/**
 * The demo migration made seller_profiles.user_id nullable (for ownerless
 * demo sellers). These checks pin the behavior real sellers rely on.
 */
describe("real seller behavior after the demo migration", () => {
  let db: Db;

  beforeAll(async () => {
    db = await createMigratedDb();
    const payload = demoPayload();
    for (const img of payload.property_images) {
      await db.query(
        "insert into demo_storage_ledger (operation_id, dataset, bucket, path, state) values (gen_random_uuid(), $1, 'property-images', $2, 'uploaded_pending')",
        [TEST_DATASET, img.storage_path],
      );
    }
    await db.query("select admin_apply_demo_dataset($1, gen_random_uuid(), $2)", [TEST_DATASET, JSON.stringify(payload)]);
    await db.query("select admin_set_demo_visibility(true)");
  }, 120_000);

  it("creates entitlements for real sellers", async () => {
    const { sellerId } = await createRealSeller(db);
    const { rows } = await db.query<{ free_active_listing_limit: number }>("select free_active_listing_limit from seller_entitlements where seller_id = $1", [sellerId]);
    expect(rows[0]?.free_active_listing_limit).toBe(5);
  });

  it("lets a signed-in user create their own seller profile but not an ownerless one", async () => {
    const userId = await createUser(db);
    await as(db, { role: "authenticated", userId }, async (tx) => {
      await expect(
        tx.query("insert into seller_profiles (user_id, account_type, display_name, username, city, state) values (null, 'individual', 'X', 'nobody.here', 'Buffalo', 'NY')"),
      ).rejects.toThrow();
    });
    await as(db, { role: "authenticated", userId }, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "insert into seller_profiles (user_id, account_type, display_name, username, city, state) values ($1, 'individual', 'X', 'owner.here', 'Buffalo', 'NY') returning id",
        [userId],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("publishes a real listing through change_property_status with the listing limit intact", async () => {
    const { userId, sellerId } = await createRealSeller(db);
    const { rows } = await db.query<{ id: string }>(
      `insert into properties (seller_id, address_line_1, city, state, postal_code, pricing_type, asking_price_cents, publish_acknowledged_at)
       values ($1, '9 Test St', 'Buffalo', 'NY', '14201', 'asking_price', 100000, now()) returning id`,
      [sellerId],
    );
    const propertyId = rows[0]!.id;
    await db.query("insert into property_images (property_id, storage_path, is_cover) values ($1, $2, true)", [propertyId, `${propertyId}/a.webp`]);
    const published = await as(
      db,
      { role: "authenticated", userId },
      async (tx) => (await tx.query<{ listing_status: string; slug: string }>("select listing_status, slug from change_property_status($1, 'for_sale')", [propertyId])).rows[0],
      { commit: true },
    );
    expect(published).toMatchObject({ listing_status: "for_sale", slug: "9-test-st-buffalo-ny" });

    await db.query("update seller_entitlements set free_active_listing_limit = 1 where seller_id = $1", [sellerId]);
    const { rows: second } = await db.query<{ id: string }>(
      `insert into properties (seller_id, address_line_1, city, state, postal_code, pricing_type, asking_price_cents, publish_acknowledged_at)
       values ($1, '10 Test St', 'Buffalo', 'NY', '14201', 'asking_price', 100000, now()) returning id`,
      [sellerId],
    );
    await db.query("insert into property_images (property_id, storage_path, is_cover) values ($1, 'b.webp', true)", [second[0]!.id]);
    await as(db, { role: "authenticated", userId }, async (tx) => {
      await expect(tx.query("select change_property_status($1, 'for_sale')", [second[0]!.id])).rejects.toThrow(/limit/);
    });
  });

  it("scopes owner reads to the owner and never matches ownerless demo sellers", async () => {
    const { userId } = await createRealSeller(db);
    const visible = await as(db, { role: "authenticated", userId }, async (tx) => {
      const own = await tx.query<{ n: number }>("select count(*) n from seller_profiles where user_id = $1", [userId]);
      const ownerless = await tx.query<{ n: number }>("select count(*) n from seller_profiles where user_id is null");
      const isOwn = await tx.query<{ v: boolean }>("select is_own_seller(id) v from public_seller_profiles where is_demo limit 1");
      return { own: Number(own.rows[0]!.n), ownerless: Number(ownerless.rows[0]!.n), isOwnDemo: isOwn.rows[0]!.v };
    });
    expect(visible).toEqual({ own: 1, ownerless: 0, isOwnDemo: false });
  });

  it("keeps real seller counts free of demo inventory and exposes demo counts separately", async () => {
    const rows = await as(db, { role: "anon" }, async (tx) =>
      (await tx.query<{ is_demo: boolean; for_sale_count: number; coming_soon_count: number; follower_count: number }>(
        "select is_demo, for_sale_count, coming_soon_count, follower_count from public_seller_profiles where is_demo",
      )).rows,
    );
    expect(rows).toEqual([{ is_demo: true, for_sale_count: 1, coming_soon_count: 1, follower_count: 0 }]);
  });

  it("lets admins list demo sellers and read their rows", async () => {
    const admin = await createUser(db);
    await db.query("insert into user_roles (user_id, role) values ($1, 'admin')", [admin]);
    const n = await as(db, { role: "authenticated", userId: admin }, async (tx) =>
      Number((await tx.query<{ n: number }>("select count(*) n from seller_profiles where is_demo")).rows[0]!.n),
    );
    expect(n).toBe(1);
  });
});
