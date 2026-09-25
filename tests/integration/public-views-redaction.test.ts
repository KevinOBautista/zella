import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  cleanupSeller,
  createTestProperty,
  createTestSeller,
  createTestUser,
  deleteTestUser,
  testEmail,
} from "../fixtures/supabase";

/**
 * A property's hidden street address must never
 * reach an anon (public) client — not through the base table, not through
 * the redacting view.
 */
describe("public_properties never leaks a hidden address", () => {
  const admin = adminClient();
  const anon = anonClient();
  let userId: string;
  let sellerId: string;
  let cityZipPropertyId: string;
  let cityOnlyPropertyId: string;
  let fullPropertyId: string;

  beforeAll(async () => {
    const email = testEmail("redaction-seller");
    userId = await createTestUser(admin, email);
    sellerId = await createTestSeller(admin, { userId, username: `itestredact${Date.now()}` });
    cityZipPropertyId = await createTestProperty(admin, { sellerId, addressVisibility: "city_zip", slug: `itest-cityzip-${Date.now()}` });
    cityOnlyPropertyId = await createTestProperty(admin, { sellerId, addressVisibility: "city_only", slug: `itest-cityonly-${Date.now()}` });
    fullPropertyId = await createTestProperty(admin, { addressVisibility: "full", sellerId, slug: `itest-full-${Date.now()}` });
  }, 30_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerId);
    await deleteTestUser(admin, userId);
  });

  it("anon cannot select the properties base table at all", async () => {
    const { data, error, status } = await anon.from("properties").select("*").eq("id", fullPropertyId);
    // RLS with no matching anon policy returns an empty result set, not a
    // 4xx — but it must never actually contain the row.
    expect(status).toBeLessThan(500);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("city_zip visibility hides the street address but keeps postal code", async () => {
    const { data } = await anon.from("public_properties").select("*").eq("id", cityZipPropertyId).single();
    expect(data).not.toBeNull();
    expect(data!.display_address_line_1).toBeNull();
    expect(data!.display_address_line_2).toBeNull();
    expect(data!.display_postal_code).toBe("14201");
    expect(data!.display_latitude).toBeNull();
    expect(data!.display_longitude).toBeNull();
    expect(JSON.stringify(data)).not.toContain("999 Hidden Test Lane");
  });

  it("city_only visibility hides the street address and the postal code", async () => {
    const { data } = await anon.from("public_properties").select("*").eq("id", cityOnlyPropertyId).single();
    expect(data).not.toBeNull();
    expect(data!.display_address_line_1).toBeNull();
    expect(data!.display_postal_code).toBeNull();
    expect(JSON.stringify(data)).not.toContain("999 Hidden Test Lane");
  });

  it("full visibility exposes the address as intended", async () => {
    const { data } = await anon.from("public_properties").select("*").eq("id", fullPropertyId).single();
    expect(data!.display_address_line_1).toBe("999 Hidden Test Lane");
  });
}, 30_000);
