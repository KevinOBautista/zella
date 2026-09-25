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
 * A seller trying to access another seller's property or lead
 * data must be denied server-side (RLS here), never merely hidden by the
 * frontend.
 */
describe("seller B cannot read or write seller A's data", () => {
  const admin = adminClient();
  let userAId: string;
  let userBId: string;
  let sellerAId: string;
  let sellerBId: string;
  let propertyAId: string;
  let inquiryAId: string;
  const emailA = testEmail("cross-seller-a");
  const emailB = testEmail("cross-seller-b");

  beforeAll(async () => {
    userAId = await createTestUser(admin, emailA);
    userBId = await createTestUser(admin, emailB);
    sellerAId = await createTestSeller(admin, { userId: userAId, username: `itestcrossa${Date.now()}` });
    sellerBId = await createTestSeller(admin, { userId: userBId, username: `itestcrossb${Date.now()}` });
    propertyAId = await createTestProperty(admin, { sellerId: sellerAId, slug: `itest-cross-${Date.now()}` });

    const { data: inquiry, error } = await admin
      .from("inquiries")
      .insert({
        property_id: propertyAId,
        seller_id: sellerAId,
        first_name: "Test",
        last_name: "Buyer",
        email: testEmail("cross-buyer"),
        inquiry_type: "question",
      })
      .select("id")
      .single();
    if (error || !inquiry) throw new Error(`inquiry setup failed: ${error?.message}`);
    inquiryAId = inquiry.id;
    await admin.from("lead_notes").insert({ inquiry_id: inquiryAId, seller_id: sellerAId, note: "Seller A's private note" });
  }, 30_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerAId);
    await cleanupSeller(admin, sellerBId);
    await deleteTestUser(admin, userAId);
    await deleteTestUser(admin, userBId);
  });

  it("seller B cannot select seller A's property from the base table", async () => {
    const asB = await signedInClient(emailB, TEST_PASSWORD);
    const { data } = await asB.from("properties").select("*").eq("id", propertyAId);
    expect(data).toEqual([]);
  });

  it("seller B cannot update seller A's property", async () => {
    const asB = await signedInClient(emailB, TEST_PASSWORD);
    const { data } = await asB.from("properties").update({ title: "Hijacked" }).eq("id", propertyAId).select();
    expect(data).toEqual([]);

    const { data: stillOriginal } = await admin.from("properties").select("title").eq("id", propertyAId).single();
    expect(stillOriginal?.title).toBe("Integration Test Property");
  });

  it("seller B cannot read seller A's lead or lead notes", async () => {
    const asB = await signedInClient(emailB, TEST_PASSWORD);
    const { data: leads } = await asB.from("inquiries").select("*").eq("id", inquiryAId);
    expect(leads).toEqual([]);

    const { data: notes } = await asB.from("lead_notes").select("*").eq("inquiry_id", inquiryAId);
    expect(notes).toEqual([]);
  });

  it("seller B cannot change seller A's lead status via the RPC", async () => {
    const asB = await signedInClient(emailB, TEST_PASSWORD);
    const { error } = await asB.rpc("update_lead_status", { p_inquiry_id: inquiryAId, p_new_status: "contacted" });
    expect(error).not.toBeNull();

    const { data: unchanged } = await admin.from("inquiries").select("lead_status").eq("id", inquiryAId).single();
    expect(unchanged?.lead_status).toBe("new");
  });
}, 30_000);
