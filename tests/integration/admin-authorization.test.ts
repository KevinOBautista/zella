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

/** Non-admins must be denied by every admin_* RPC, not just the admin UI. */
describe("non-admin users cannot call admin RPCs", () => {
  const admin = adminClient();
  let userId: string;
  let sellerId: string;
  let propertyId: string;
  const email = testEmail("non-admin");

  beforeAll(async () => {
    userId = await createTestUser(admin, email);
    sellerId = await createTestSeller(admin, { userId, username: `itestnonadmin${Date.now()}` });
    propertyId = await createTestProperty(admin, { sellerId, slug: `itest-nonadmin-${Date.now()}` });
  }, 30_000);

  afterAll(async () => {
    await cleanupSeller(admin, sellerId);
    await deleteTestUser(admin, userId);
  });

  it("is_admin() returns false for a regular user", async () => {
    const asUser = await signedInClient(email, TEST_PASSWORD);
    const { data } = await asUser.rpc("is_admin");
    expect(data).toBe(false);
  });

  it("admin_set_property_moderation is rejected for a non-admin", async () => {
    const asUser = await signedInClient(email, TEST_PASSWORD);
    const { error } = await asUser.rpc("admin_set_property_moderation", { p_property_id: propertyId, p_status: "hidden" });
    expect(error).not.toBeNull();

    const { data: unchanged } = await admin.from("properties").select("moderation_status").eq("id", propertyId).single();
    expect(unchanged?.moderation_status).toBe("clear");
  });

  it("admin_set_seller_status is rejected for a non-admin", async () => {
    const asUser = await signedInClient(email, TEST_PASSWORD);
    const { error } = await asUser.rpc("admin_set_seller_status", { p_seller_id: sellerId, p_status: "suspended" });
    expect(error).not.toBeNull();
  });

  it("non-admin gets nothing from the admin-only reports and audit-log tables", async () => {
    const asUser = await signedInClient(email, TEST_PASSWORD);
    const { data: reports } = await asUser.from("reports").select("*");
    expect(reports).toEqual([]);
    const { data: auditLog } = await asUser.from("admin_audit_logs").select("*");
    expect(auditLog).toEqual([]);
  });
}, 30_000);
