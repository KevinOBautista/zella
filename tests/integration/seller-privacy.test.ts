import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  cleanupSeller,
  createTestSeller,
  createTestUser,
  deleteTestUser,
  testEmail,
} from "../fixtures/supabase";

/** A seller's private email and phone must never appear in a public response. */
describe("public_seller_profiles never exposes private contact info", () => {
  const admin = adminClient();
  const anon = anonClient();
  let userId: string;
  let sellerId: string;
  const email = testEmail("privacy-seller");

  beforeAll(async () => {
    userId = await createTestUser(admin, email);
    sellerId = await createTestSeller(admin, { userId, username: `itestprivacy${Date.now()}` });
  }, 30_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerId);
    await deleteTestUser(admin, userId);
  });

  it("anon cannot select the seller_profiles base table", async () => {
    const { data } = await anon.from("seller_profiles").select("*").eq("id", sellerId);
    expect(data).toEqual([]);
  });

  it("public_seller_profiles has no email or phone column at all", async () => {
    const { data, error } = await anon.from("public_seller_profiles").select("*").eq("id", sellerId).single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    const keys = Object.keys(data as object);
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("phone");
    expect(JSON.stringify(data)).not.toContain(email);
  });
});
