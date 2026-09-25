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
 * Regression test for a real bug caught during manual testing: the
 * open_houses/properties "visible via own RSVP" policies (migration
 * 20260913000012) formed an RLS cycle with open_house_rsvps_select —
 * evaluating `properties` for ANY authenticated user could recurse through
 * open_house_rsvps -> open_houses -> open_house_rsvps and fail with
 * Postgres error 42P17. This broke /dashboard/leads' `properties` embed
 * for every seller, not just the buyer-RSVP path the policies were
 * written for. Fixed in migration 20260913000013 (SECURITY DEFINER
 * helper functions instead of raw cross-table EXISTS subqueries).
 */
describe("properties/open_houses RLS policies do not recurse", () => {
  const admin = adminClient();
  let userId: string;
  let sellerId: string;
  let propertyId: string;
  const email = testEmail("recursion-seller");

  beforeAll(async () => {
    userId = await createTestUser(admin, email);
    sellerId = await createTestSeller(admin, { userId, username: `itestrecur${Date.now()}` });
    propertyId = await createTestProperty(admin, { sellerId, slug: `itest-recur-${Date.now()}` });
    await admin.from("inquiries").insert({
      property_id: propertyId,
      seller_id: sellerId,
      first_name: "Test",
      last_name: "Buyer",
      email: testEmail("recur-buyer"),
      inquiry_type: "question",
    });
  }, 30_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerId);
    await deleteTestUser(admin, userId);
  });

  it("selecting inquiries embedded with properties does not error with 42P17", async () => {
    const asSeller = await signedInClient(email, TEST_PASSWORD);
    const { data, error } = await asSeller
      .from("inquiries")
      .select("*, properties(title, slug, address_line_1, city)")
      .eq("seller_id", sellerId);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0]?.properties?.title).toBe("Integration Test Property");
  });

  it("selecting properties directly as the owning seller still works", async () => {
    const asSeller = await signedInClient(email, TEST_PASSWORD);
    const { data, error } = await asSeller.from("properties").select("*").eq("id", propertyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
}, 30_000);
