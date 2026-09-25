import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupSeller,
  createTestProperty,
  createTestSeller,
  createTestUser,
  deleteTestUser,
  signedInClient,
  testEmail,
  TEST_PASSWORD,
} from "../fixtures/supabase";

/**
 * The five-active-listing limit must hold even under a
 * concurrent publish race — the `FOR UPDATE` lock on seller_entitlements
 * inside change_property_status is what this test actually exercises.
 */
describe("the active-listing limit holds under concurrent publish attempts", () => {
  const admin = adminClient();
  let userId: string;
  let sellerId: string;
  let propertyIds: string[];
  const email = testEmail("race-seller");

  beforeAll(async () => {
    userId = await createTestUser(admin, email);
    sellerId = await createTestSeller(admin, { userId, username: `itestrace${Date.now()}` });

    propertyIds = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        createTestProperty(admin, { sellerId, listingStatus: "draft", slug: `itest-race-${Date.now()}-${i}` }),
      ),
    );
    // Publish acknowledgement + at least one photo are required by
    // change_property_status on first publish.
    for (const id of propertyIds) {
      await admin.from("properties").update({ publish_acknowledged_at: new Date().toISOString() }).eq("id", id);
      await admin.from("property_images").insert({ property_id: id, storage_path: `${id}/fake.webp`, is_cover: true });
    }
  }, 60_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerId);
    await deleteTestUser(admin, userId);
  });

  it("exactly 5 of 6 concurrent activations succeed, never more", async () => {
    const asSeller = await signedInClient(email, TEST_PASSWORD);

    const results = await Promise.all(
      propertyIds.map((id) => asSeller.rpc("change_property_status", { p_property_id: id, p_target_status: "for_sale" })),
    );

    const succeeded = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);

    expect(succeeded).toHaveLength(5);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.error?.message ?? "").toMatch(/limit/i);

    const { data: activeRows } = await admin
      .from("properties")
      .select("id")
      .eq("seller_id", sellerId)
      .in("listing_status", ["coming_soon", "for_sale", "under_contract"]);
    expect(activeRows).toHaveLength(5);
  });
}, 60_000);
