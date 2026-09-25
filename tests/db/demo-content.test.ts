// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  as,
  createMigratedDb,
  createOpenHouse,
  createRealProperty,
  createRealSeller,
  createUser,
  type Db,
  type Tx,
} from "./harness";
import { TEST_DATASET, demoPayload, ids, paths } from "./demo-payload";

const OP = "00000000-0000-4000-8000-0000000000aa";

/** Runs one statement inside a savepoint and returns its SQLSTATE (or null). */
async function sqlState(tx: Tx, sql: string, params: readonly unknown[] = []): Promise<{ code: string | null; message: string }> {
  await tx.exec("savepoint probe");
  try {
    await tx.query(sql, [...params]);
    await tx.exec("release savepoint probe");
    return { code: null, message: "" };
  } catch (err) {
    await tx.exec("rollback to savepoint probe");
    const e = err as { code?: string; message: string };
    return { code: e.code ?? "unknown", message: e.message };
  }
}

async function ledgerUpload(db: Db, path: string, operationId = OP) {
  await as(
    db,
    { role: "service_role" },
    (tx) =>
      tx.query(
        `insert into demo_storage_ledger (operation_id, dataset, bucket, path, sha256, state)
         values ($1, $2, 'property-images', $3, 'x', 'uploaded_pending')
         on conflict (bucket, path) do update set state = 'uploaded_pending', operation_id = excluded.operation_id
           where demo_storage_ledger.state <> 'live'`,
        [operationId, TEST_DATASET, path],
      ),
    { commit: true },
  );
}

async function applyDemo(db: Db, payload = demoPayload(), operationId = OP) {
  for (const img of payload.property_images) await ledgerUpload(db, img.storage_path, operationId);
  return as(
    db,
    { role: "service_role" },
    async (tx) => (await tx.query<{ r: Record<string, unknown> }>("select admin_apply_demo_dataset($1, $2, $3) as r", [TEST_DATASET, operationId, JSON.stringify(payload)])).rows[0]!.r,
    { commit: true },
  );
}

async function setVisible(db: Db, visible: boolean) {
  await as(db, { role: "service_role" }, (tx) => tx.query("select admin_set_demo_visibility($1)", [visible]), { commit: true });
}

async function count(db: Db, sql: string, params: unknown[] = []) {
  const { rows } = await db.query<{ n: number }>(sql, params);
  return Number(rows[0]!.n);
}

describe("demo content schema", () => {
  let db: Db;
  let real: { userId: string; sellerId: string };
  let realProperty: { propertyId: string; slug: string };
  let realOpenHouse: string;
  let admin: string;
  let buyer: string;

  beforeAll(async () => {
    db = await createMigratedDb();
    real = await createRealSeller(db);
    realProperty = await createRealProperty(db, real.sellerId);
    realOpenHouse = await createOpenHouse(db, realProperty.propertyId, real.sellerId);
    admin = await createUser(db, "admin@example.test");
    await db.query("insert into user_roles (user_id, role) values ($1, 'admin')", [admin]);
    buyer = await createUser(db, "buyer@example.test");
    await applyDemo(db);
  }, 120_000);

  beforeEach(async () => {
    await setVisible(db, false);
  });

  describe("seeding", () => {
    it("marks every seeded row with the dataset", async () => {
      expect(await count(db, "select count(*) n from seller_profiles where is_demo and demo_dataset = $1 and user_id is null", [TEST_DATASET])).toBe(1);
      expect(await count(db, "select count(*) n from properties where is_demo and demo_dataset = $1", [TEST_DATASET])).toBe(2);
      expect(await count(db, "select count(*) n from property_images where is_demo and demo_dataset = $1", [TEST_DATASET])).toBe(2);
      expect(await count(db, "select count(*) n from open_houses where is_demo and demo_dataset = $1", [TEST_DATASET])).toBe(1);
    });

    it("is idempotent", async () => {
      const before = await count(db, "select count(*) n from properties");
      const result = await applyDemo(db);
      expect(await count(db, "select count(*) n from properties")).toBe(before);
      expect(result).toMatchObject({ sellers: 1, properties: 2, property_images: 2, open_houses: 1 });
    });

    it("gives demo sellers no billing entitlement", async () => {
      expect(await count(db, "select count(*) n from seller_entitlements where seller_id = $1", [ids.seller])).toBe(0);
    });

    it("refuses to take over an id that belongs to a non-demo row", async () => {
      const payload = demoPayload();
      payload.properties[0]!.id = realProperty.propertyId;
      const err = await as(db, { role: "service_role" }, (tx) =>
        sqlState(tx, "select admin_apply_demo_dataset($1, $2, $3)", [TEST_DATASET, OP, JSON.stringify(payload)]),
      );
      expect(err.code).toBe("DM001");
    });

    it("requires images to be recorded in the storage ledger before rows reference them", async () => {
      const payload = demoPayload({ secondImagePath: `demo/${TEST_DATASET}/home-a/unledgered.webp` });
      const err = await as(db, { role: "service_role" }, (tx) =>
        sqlState(tx, "select admin_apply_demo_dataset($1, $2, $3)", [TEST_DATASET, OP, JSON.stringify(payload)]),
      );
      expect(err.code).toBe("DM002");
    });

    it("promotes referenced ledger paths to live and marks superseded ones for deletion", async () => {
      const newPath = `demo/${TEST_DATASET}/home-a/cccc-kitchen.webp`;
      await applyDemo(db, demoPayload({ secondImagePath: newPath }), "00000000-0000-4000-8000-0000000000bb");
      const { rows } = await db.query<{ path: string; state: string }>("select path, state from demo_storage_ledger where dataset = $1 order by path", [TEST_DATASET]);
      expect(rows).toEqual([
        { path: paths.image, state: "live" },
        { path: paths.image2, state: "delete_pending" },
        { path: newPath, state: "live" },
      ]);
      // Restore the original payload for later tests.
      await applyDemo(db);
      const restored = await db.query<{ state: string }>("select state from demo_storage_ledger where path = $1", [paths.image2]);
      expect(restored.rows[0]!.state).toBe("live");
    });

    it("removes dataset rows that are no longer in the payload", async () => {
      await applyDemo(db, demoPayload({ dropComingSoon: true }));
      expect(await count(db, "select count(*) n from properties where id = $1", [ids.comingSoon])).toBe(0);
      await applyDemo(db);
      expect(await count(db, "select count(*) n from properties where id = $1", [ids.comingSoon])).toBe(1);
    });

    it("cannot be called by anon or authenticated users", async () => {
      for (const actor of [{ role: "anon" as const }, { role: "authenticated" as const, userId: admin }]) {
        const err = await as(db, actor, (tx) =>
          sqlState(tx, "select admin_apply_demo_dataset($1, $2, $3)", [TEST_DATASET, OP, JSON.stringify(demoPayload())]),
        );
        expect(err.code).toBe("42501");
      }
    });
  });

  describe("owner requirement", () => {
    it("still requires real sellers to have an owner", async () => {
      const err = await as(db, { role: "service_role" }, (tx) =>
        sqlState(tx, "insert into seller_profiles (account_type, display_name, username, city, state) values ('individual', 'X', 'ownerless.real', 'Buffalo', 'NY')"),
      );
      expect(err.code).toBe("23514");
    });
  });

  describe("demo flags are trusted-only", () => {
    it("rejects a user marking their own seller or property as demo", async () => {
      await as(db, { role: "authenticated", userId: real.userId }, async (tx) => {
        expect((await sqlState(tx, "update seller_profiles set is_demo = true, demo_dataset = 'x' where id = $1", [real.sellerId])).code).toBe("DM001");
        expect((await sqlState(tx, "update properties set is_demo = true, demo_dataset = 'x' where id = $1", [realProperty.propertyId])).code).toBe("DM001");
        expect((await sqlState(tx, "update properties set seed_key = 'x' where id = $1", [realProperty.propertyId])).code).toBe("DM001");
      });
    });

    it("rejects a user creating demo-flagged rows", async () => {
      const newUser = await createUser(db);
      await as(db, { role: "authenticated", userId: newUser }, async (tx) => {
        const err = await sqlState(
          tx,
          "insert into seller_profiles (user_id, account_type, display_name, username, city, state, is_demo, demo_dataset) values ($1, 'individual', 'X', 'sneaky.demo', 'Buffalo', 'NY', true, 'x')",
          [newUser],
        );
        expect(err.code).toBe("DM001");
      });
    });

    it("rejects admins editing, moderating or deleting demo rows", async () => {
      await as(db, { role: "authenticated", userId: admin }, async (tx) => {
        expect((await sqlState(tx, "update properties set title = 'hacked' where id = $1", [ids.property])).code).toBe("DM001");
        expect((await sqlState(tx, "update seller_profiles set is_demo = false, demo_dataset = null where id = $1", [ids.seller])).code).toBe("DM001");
        expect((await sqlState(tx, "delete from open_houses where id = $1", [ids.openHouse])).code).toBe("DM001");
        expect((await sqlState(tx, "delete from property_images where id = $1", [ids.image])).code).toBe("DM001");
        expect((await sqlState(tx, "select admin_set_seller_status($1, 'suspended')", [ids.seller])).code).toBe("DM001");
        expect((await sqlState(tx, "select admin_set_property_moderation($1, 'hidden')", [ids.property])).code).toBe("DM001");
        expect((await sqlState(tx, "select cancel_open_house($1, 'x')", [ids.openHouse])).code).toBe("DM001");
        expect((await sqlState(tx, "insert into property_features (property_id, feature_id) select $1, id from features limit 1", [ids.property])).code).toBe("DM001");
        expect((await sqlState(tx, "insert into property_custom_features (property_id, name) values ($1, 'Pool')", [ids.property])).code).toBe("DM001");
        expect((await sqlState(tx, "insert into property_agents (property_id, name) values ($1, 'Agent')", [ids.property])).code).toBe("DM001");
      });
    });

    it("keeps demo sellers and their inventory consistent", async () => {
      await as(db, { role: "service_role" }, async (tx) => {
        // A real property cannot be created under, or moved to, a demo seller.
        expect(
          (await sqlState(tx, "insert into properties (seller_id, title) values ($1, 'real under demo')", [ids.seller])).code,
        ).toBe("DM001");
        expect((await sqlState(tx, "update properties set seller_id = $1 where id = $2", [ids.seller, realProperty.propertyId])).code).toBe("DM001");
        // A demo open house cannot point at a real property.
        expect((await sqlState(tx, "update open_houses set property_id = $1 where id = $2", [realProperty.propertyId, ids.openHouse])).code).toBe("DM001");
        // A real open house cannot point at a demo property.
        expect((await sqlState(tx, "update open_houses set property_id = $1 where id = $2", [ids.property, realOpenHouse])).code).toBe("DM001");
        // A real image cannot be attached to a demo property.
        expect(
          (await sqlState(tx, "insert into property_images (property_id, storage_path) values ($1, 'x.webp')", [ids.property])).code,
        ).toBe("DM001");
      });
    });

    it("still lets the real owner edit their real listing", async () => {
      await as(db, { role: "authenticated", userId: real.userId }, async (tx) => {
        expect((await sqlState(tx, "update properties set title = 'Updated' where id = $1", [realProperty.propertyId])).code).toBeNull();
      });
    });
  });

  describe("demo interactions are rejected by the database", () => {
    const inquiry = (propertyId: string | null, sellerId: string) =>
      [
        "insert into inquiries (property_id, seller_id, first_name, last_name, email) values ($1, $2, 'A', 'B', 'a@example.test') returning id",
        [propertyId, sellerId],
      ] as const;

    it("blocks inquiries, RSVPs, notifications and activity even for the service role", async () => {
      await as(db, { role: "service_role" }, async (tx) => {
        expect((await sqlState(tx, ...inquiry(ids.property, ids.seller))).code).toBe("DM001");
        expect((await sqlState(tx, ...inquiry(null, ids.seller))).code).toBe("DM001");
        expect(
          (await sqlState(tx, "insert into open_house_rsvps (open_house_id, first_name, last_name, email) values ($1, 'A', 'B', 'a@example.test')", [ids.openHouse])).code,
        ).toBe("DM001");
        for (const [type, id] of [["property", ids.property], ["open_house", ids.openHouse], ["seller_profile", ids.seller]] as const) {
          const err = await sqlState(
            tx,
            "insert into notifications (user_id, type, title, entity_type, entity_id) values ($1, 'new_property', 't', $2, $3)",
            [buyer, type, id],
          );
          expect(err.code, type).toBe("DM001");
        }
        expect(
          (await sqlState(tx, "insert into property_activity (property_id, seller_id, event_type) values ($1, $2, 'x')", [ids.property, ids.seller])).code,
        ).toBe("DM001");
      });
    });

    it("blocks saves and follows by signed-in users", async () => {
      await as(db, { role: "authenticated", userId: buyer }, async (tx) => {
        expect((await sqlState(tx, "insert into property_saves (property_id, user_id) values ($1, $2)", [ids.property, buyer])).code).toBe("DM001");
        expect((await sqlState(tx, "insert into seller_follows (seller_id, follower_user_id) values ($1, $2)", [ids.seller, buyer])).code).toBe("DM001");
      });
    });

    it("blocks retargeting existing real interactions to demo entities by update or upsert", async () => {
      await as(db, { role: "authenticated", userId: buyer }, async (tx) => {
        await tx.query("insert into property_saves (property_id, user_id) values ($1, $2)", [realProperty.propertyId, buyer]);
        await tx.query("insert into seller_follows (seller_id, follower_user_id) values ($1, $2)", [real.sellerId, buyer]);
        expect((await sqlState(tx, "update property_saves set property_id = $1 where user_id = $2", [ids.property, buyer])).code).toBe("DM001");
        expect((await sqlState(tx, "update seller_follows set seller_id = $1 where follower_user_id = $2", [ids.seller, buyer])).code).toBe("DM001");
        expect(
          (
            await sqlState(
              tx,
              "insert into seller_follows (seller_id, follower_user_id) values ($1, $2) on conflict (seller_id, follower_user_id) do update set seller_id = $3",
              [real.sellerId, buyer, ids.seller],
            )
          ).code,
        ).toBe("DM001");
      });
      await as(db, { role: "service_role" }, async (tx) => {
        const { rows } = await tx.query<{ id: string }>(inquiry(realProperty.propertyId, real.sellerId)[0], [realProperty.propertyId, real.sellerId]);
        const inquiryId = rows[0]!.id;
        expect((await sqlState(tx, "update inquiries set property_id = $1, seller_id = $2 where id = $3", [ids.property, ids.seller, inquiryId])).code).toBe("DM001");
        const { rows: rsvp } = await tx.query<{ id: string }>(
          "insert into open_house_rsvps (open_house_id, first_name, last_name, email) values ($1, 'A', 'B', 'r@example.test') returning id",
          [realOpenHouse],
        );
        expect((await sqlState(tx, "update open_house_rsvps set open_house_id = $1 where id = $2", [ids.openHouse, rsvp[0]!.id])).code).toBe("DM001");
        expect(
          (await sqlState(tx, "insert into lead_notes (inquiry_id, seller_id, note) values ($1, $2, 'n')", [inquiryId, ids.seller])).code,
        ).toBe("DM001");
      });
    });

    it("reports the error in an application-readable form", async () => {
      const err = await as(db, { role: "service_role" }, (tx) => sqlState(tx, ...inquiry(ids.property, ids.seller)));
      expect(err.message).toBe("DEMO_CONTENT");
    });

    it("leaves real interactions working", async () => {
      await as(db, { role: "service_role" }, async (tx) => {
        expect((await sqlState(tx, ...inquiry(realProperty.propertyId, real.sellerId))).code).toBeNull();
        expect(
          (await sqlState(tx, "insert into open_house_rsvps (open_house_id, first_name, last_name, email) values ($1, 'A', 'B', 'ok@example.test')", [realOpenHouse])).code,
        ).toBeNull();
        expect(
          (await sqlState(tx, "insert into notifications (user_id, type, title, entity_type, entity_id) values ($1, 'new_property', 't', 'property', $2)", [buyer, realProperty.propertyId])).code,
        ).toBeNull();
      });
      await as(db, { role: "authenticated", userId: buyer }, async (tx) => {
        expect((await sqlState(tx, "insert into property_saves (property_id, user_id) values ($1, $2)", [realProperty.propertyId, buyer])).code).toBeNull();
        expect((await sqlState(tx, "insert into seller_follows (seller_id, follower_user_id) values ($1, $2)", [real.sellerId, buyer])).code).toBeNull();
      });
    });

    it("still accepts reports about demo content", async () => {
      await as(db, { role: "service_role" }, async (tx) => {
        expect((await sqlState(tx, "insert into reports (property_id, reason) values ($1, 'other')", [ids.property])).code).toBeNull();
      });
    });
  });

  describe("visibility switch", () => {
    const publicCounts = (tx: Tx) =>
      Promise.all(
        [
          "select count(*) n from public_properties where is_demo",
          "select count(*) n from public_seller_profiles where is_demo",
          "select count(*) n from public_open_houses where is_demo",
          "select count(*) n from public_property_images where property_id = '" + ids.property + "'",
        ].map(async (sql) => Number((await tx.query<{ n: number }>(sql)).rows[0]!.n)),
      );

    it("hides demo content by default", async () => {
      const fresh = await createMigratedDb();
      const { rows } = await fresh.query<{ v: boolean }>("select demo_content_visible() as v");
      expect(rows[0]!.v).toBe(false);
      await fresh.close();
    });

    it("applies to every public view for anon and signed-in users", async () => {
      for (const actor of [{ role: "anon" as const }, { role: "authenticated" as const, userId: buyer }]) {
        expect(await as(db, actor, publicCounts)).toEqual([0, 0, 0, 0]);
      }
      await setVisible(db, true);
      for (const actor of [{ role: "anon" as const }, { role: "authenticated" as const, userId: buyer }]) {
        expect(await as(db, actor, publicCounts)).toEqual([2, 1, 1, 2]);
      }
    });

    it("still shows real content while demos are hidden", async () => {
      const n = await as(db, { role: "anon" }, async (tx) => Number((await tx.query<{ n: number }>("select count(*) n from public_properties where not is_demo")).rows[0]!.n));
      expect(n).toBeGreaterThan(0);
    });

    it("exposes demo open houses without a street address", async () => {
      await setVisible(db, true);
      const row = await as(db, { role: "anon" }, async (tx) => (await tx.query<Record<string, unknown>>("select * from public_open_houses where id = $1", [ids.openHouse])).rows[0]);
      expect(row).toMatchObject({ is_demo: true, display_address_line_1: null, city: "Kenmore" });
    });

    it("exposes image credits through the public image view", async () => {
      await setVisible(db, true);
      const credit = await as(db, { role: "anon" }, async (tx) => (await tx.query<{ credit: string }>("select credit from public_property_images where id = $1", [ids.image])).rows[0]?.credit);
      expect(credit).toBe("AI-generated illustrative image");
    });

    it("hides demo rows from direct table reads unless visible (admins excepted)", async () => {
      // Demo rows can never be reached through owner policies (no owner) but
      // the restrictive policy is the belt-and-braces guarantee.
      const adminSees = await as(db, { role: "authenticated", userId: admin }, async (tx) => Number((await tx.query<{ n: number }>("select count(*) n from properties where is_demo")).rows[0]!.n));
      expect(adminSees).toBe(2);
      for (const actor of [{ role: "anon" as const }, { role: "authenticated" as const, userId: buyer }]) {
        const n = await as(db, actor, async (tx) =>
          Number((await tx.query<{ n: number }>("select (select count(*) from properties where is_demo) + (select count(*) from open_houses where is_demo) + (select count(*) from seller_profiles where is_demo) + (select count(*) from property_images where is_demo) as n")).rows[0]!.n),
        );
        expect(n).toBe(0);
      }
      const policies = await count(db, "select count(*) n from pg_policies where policyname like 'demo_visibility%' and permissive = 'RESTRICTIVE'");
      expect(policies).toBe(8);
    });

    it("can only be changed by the service role", async () => {
      for (const actor of [{ role: "anon" as const }, { role: "authenticated" as const, userId: admin }]) {
        await as(db, actor, async (tx) => {
          expect((await sqlState(tx, "select admin_set_demo_visibility(true)")).code).toBe("42501");
          const upd = await sqlState(tx, "update app_settings set value = 'true'::jsonb");
          // Either a privilege error or zero visible rows — never a change.
          if (upd.code === null) {
            const v = await tx.query<{ v: boolean }>("select demo_content_visible() as v");
            expect(v.rows[0]!.v).toBe(false);
          }
        });
      }
    });
  });

  describe("date refresh", () => {
    it("updates only this dataset's open houses", async () => {
      const starts = "2030-01-05T18:00:00.000Z";
      const ends = "2030-01-05T20:00:00.000Z";
      const realBefore = (await db.query<{ starts_at: Date }>("select starts_at from open_houses where id = $1", [realOpenHouse])).rows[0]!.starts_at;
      const updated = await as(
        db,
        { role: "service_role" },
        async (tx) =>
          (await tx.query<{ n: number }>("select admin_refresh_demo_open_house_dates($1, $2) as n", [TEST_DATASET, JSON.stringify([{ seed_key: "oh-a", starts_at: starts, ends_at: ends }])])).rows[0]!.n,
        { commit: true },
      );
      expect(updated).toBe(1);
      const demo = (await db.query<{ starts_at: Date }>("select starts_at from open_houses where id = $1", [ids.openHouse])).rows[0]!.starts_at;
      expect(demo.toISOString()).toBe(starts);
      const realAfter = (await db.query<{ starts_at: Date }>("select starts_at from open_houses where id = $1", [realOpenHouse])).rows[0]!.starts_at;
      expect(realAfter.toISOString()).toBe(realBefore.toISOString());
    });

    it("fails on unknown seed keys without partial updates", async () => {
      const err = await as(db, { role: "service_role" }, (tx) =>
        sqlState(tx, "select admin_refresh_demo_open_house_dates($1, $2)", [
          TEST_DATASET,
          JSON.stringify([{ seed_key: "nope", starts_at: "2030-01-01T00:00:00Z", ends_at: "2030-01-01T01:00:00Z" }]),
        ]),
      );
      expect(err.code).toBe("DM003");
    });
  });

  describe("dataset removal", () => {
    it("deletes only the dataset and marks its storage for deletion", async () => {
      const other = await createMigratedDb();
      const s = await createRealSeller(other);
      await createRealProperty(other, s.sellerId);
      await applyDemo(other);
      const realCount = await count(other, "select count(*) n from properties where not is_demo");

      const result = await as(
        other,
        { role: "service_role" },
        async (tx) => (await tx.query<{ bucket: string; path: string }>("select * from admin_remove_demo_dataset($1)", [TEST_DATASET])).rows,
        { commit: true },
      );
      expect(result.map((r) => r.path).sort()).toEqual([paths.image, paths.image2].sort());
      expect(await count(other, "select count(*) n from properties where is_demo")).toBe(0);
      expect(await count(other, "select count(*) n from seller_profiles where is_demo")).toBe(0);
      expect(await count(other, "select count(*) n from properties where not is_demo")).toBe(realCount);
      expect(await count(other, "select count(*) n from demo_storage_ledger where state = 'delete_pending'")).toBe(2);
      await other.close();
    });
  });
});

describe("dev fixture cleanup", () => {
  let db: Db;
  let fixtureUser: string;
  let fixtureSeller: string;
  let fixtureProperty: string;
  let keepUser: string;

  beforeEach(async () => {
    db = await createMigratedDb();
    fixtureUser = await createUser(db, "seller@dev.zella.test");
    ({ sellerId: fixtureSeller } = await createRealSeller(db, { userId: fixtureUser }));
    ({ propertyId: fixtureProperty } = await createRealProperty(db, fixtureSeller));
    keepUser = await createUser(db, "owner@example.test");
  }, 60_000);

  async function manifestFor(extra: { table: string; id: string }[] = []) {
    const rowsFor = async (table: string, id: string) => {
      const { rows } = await db.query<{ created_at: Date }>(`select created_at from ${table} where id = $1`, [id]);
      return { table, id, created_at: rows[0]!.created_at.toISOString() };
    };
    return {
      rows: [
        await rowsFor("properties", fixtureProperty),
        await rowsFor("seller_profiles", fixtureSeller),
        ...(await Promise.all(extra.map((e) => rowsFor(e.table, e.id)))),
      ],
      auth_users: [await rowsFor("auth.users", fixtureUser)],
      storage: [{ bucket: "property-images", path: `${fixtureProperty}/a.webp` }],
    };
  }

  const run = (manifest: unknown) =>
    as(db, { role: "service_role" }, async (tx) => {
      const probe = await sqlState(tx, "select admin_remove_dev_fixtures($1, $2)", [JSON.stringify(manifest), OP]);
      if (probe.code) return probe;
      return { code: null, message: "" };
    }, { commit: true });

  it("deletes exactly the listed rows and ledgers their storage", async () => {
    const res = await run(await manifestFor());
    expect(res.code).toBeNull();
    expect(await count(db, "select count(*) n from properties where id = $1", [fixtureProperty])).toBe(0);
    expect(await count(db, "select count(*) n from seller_profiles where id = $1", [fixtureSeller])).toBe(0);
    expect(await count(db, "select count(*) n from auth.users where id = $1", [keepUser])).toBe(1);
    expect(await count(db, "select count(*) n from demo_storage_ledger where state = 'delete_pending' and path = $1", [`${fixtureProperty}/a.webp`])).toBe(1);
  });

  it("ignores Supabase's own auth records for a listed account", async () => {
    await db.query("insert into auth.identities (user_id) values ($1)", [fixtureUser]);
    await db.query("insert into auth.sessions (user_id) values ($1)", [fixtureUser]);
    const res = await run(await manifestFor());
    expect(res.code).toBeNull();
    expect(await count(db, "select count(*) n from properties where id = $1", [fixtureProperty])).toBe(0);
  });

  it("aborts when a real record references a listed row", async () => {
    await db.query("insert into property_saves (property_id, user_id) values ($1, $2)", [fixtureProperty, keepUser]);
    const res = await run(await manifestFor());
    expect(res.code).toBe("DM004");
    expect(await count(db, "select count(*) n from properties where id = $1", [fixtureProperty])).toBe(1);
  });

  it("aborts when a real record references a listed auth user", async () => {
    const { propertyId } = await createRealProperty(db, (await createRealSeller(db, { userId: keepUser })).sellerId);
    await db.query("insert into property_activity (property_id, seller_id, event_type, created_by) select $1, seller_id, 'x', $2 from properties where id = $1", [propertyId, fixtureUser]);
    const res = await run(await manifestFor());
    expect(res.code).toBe("DM004");
  });

  it("aborts when a row no longer matches its fingerprint", async () => {
    const manifest = await manifestFor();
    manifest.rows[0]!.created_at = "2020-01-01T00:00:00.000Z";
    const res = await run(manifest);
    expect(res.code).toBe("DM005");
    expect(await count(db, "select count(*) n from properties where id = $1", [fixtureProperty])).toBe(1);
  });

  it("refuses tables outside the allow-list", async () => {
    const manifest = await manifestFor();
    (manifest.rows as { table: string; id: string; created_at: string }[]).push({ table: "features", id: fixtureProperty, created_at: manifest.rows[0]!.created_at });
    const res = await run(manifest);
    expect(res.code).toBe("DM006");
  });

  it("is not callable by signed-in users", async () => {
    const manifest = await manifestFor();
    const res = await as(db, { role: "authenticated", userId: keepUser }, (tx) => sqlState(tx, "select admin_remove_dev_fixtures($1, $2)", [JSON.stringify(manifest), OP]));
    expect(res.code).toBe("42501");
  });
});
