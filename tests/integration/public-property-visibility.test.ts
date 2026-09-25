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

/** Draft, paused, archived, and admin-hidden properties are never publicly fetchable. */
describe("non-public listing statuses are excluded from public_properties", () => {
  const admin = adminClient();
  const anon = anonClient();
  let userId: string;
  let sellerId: string;
  let draftId: string;
  let pausedId: string;
  let hiddenId: string;
  let visibleId: string;

  beforeAll(async () => {
    const email = testEmail("visibility-seller");
    userId = await createTestUser(admin, email);
    sellerId = await createTestSeller(admin, { userId, username: `itestvis${Date.now()}` });
    draftId = await createTestProperty(admin, { sellerId, listingStatus: "draft", slug: `itest-draft-${Date.now()}` });
    pausedId = await createTestProperty(admin, { sellerId, listingStatus: "paused", slug: `itest-paused-${Date.now()}` });
    hiddenId = await createTestProperty(admin, { sellerId, moderationStatus: "hidden", slug: `itest-hidden-${Date.now()}` });
    visibleId = await createTestProperty(admin, { sellerId, slug: `itest-visible-${Date.now()}` });
  }, 30_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerId);
    await deleteTestUser(admin, userId);
  });

  it.each([
    ["draft", () => draftId],
    ["paused", () => pausedId],
    ["admin-hidden", () => hiddenId],
  ])("%s properties are absent from public_properties", async (_label, getId) => {
    const { data } = await anon.from("public_properties").select("id").eq("id", getId());
    expect(data).toEqual([]);
  });

  it("a normal for_sale property is present", async () => {
    const { data } = await anon.from("public_properties").select("id").eq("id", visibleId).single();
    expect(data?.id).toBe(visibleId);
  });

  it("a suspended seller's properties disappear from public view entirely", async () => {
    await admin.from("seller_profiles").update({ status: "suspended" }).eq("id", sellerId);
    const { data } = await anon.from("public_properties").select("id").eq("id", visibleId);
    expect(data).toEqual([]);
    const { data: sellerRow } = await anon.from("public_seller_profiles").select("id").eq("id", sellerId);
    expect(sellerRow).toEqual([]);
    await admin.from("seller_profiles").update({ status: "active" }).eq("id", sellerId);
  });
}, 30_000);
