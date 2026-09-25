// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type Call } from "@tests/helpers/fake-supabase";

const state = vi.hoisted(() => ({
  demo: false,
  admin: null as ReturnType<typeof import("@tests/helpers/fake-supabase").fakeSupabase> | null,
  server: null as ReturnType<typeof import("@tests/helpers/fake-supabase").fakeSupabase> | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/demo/server", () => ({ isDemoTarget: vi.fn(async () => state.demo) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin!.client }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.server!.client }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => true) }));
vi.mock("@/lib/turnstile/verify", () => ({ verifyTurnstile: vi.fn(async () => true) }));
vi.mock("@/features/leads/notify", () => ({ notifySellerOfInquiry: vi.fn(async () => undefined) }));
vi.mock("@/lib/email/send", () => ({ sendTrackedEmail: vi.fn(async () => undefined) }));
vi.mock("@/config/env", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://example.test" }) }));
vi.mock("@/lib/auth/session", () => ({
  requireVerifiedUser: vi.fn(async () => ({ id: "00000000-0000-4000-8000-000000000001", email_confirmed_at: "x" })),
  requireSeller: vi.fn(),
}));

import { submitInquiryAction } from "@/features/leads/actions";
import { submitRsvpAction } from "@/features/open-houses/actions";
import { toggleSaveAction } from "@/features/saves/actions";
import { toggleFollowAction, updateFollowPreferencesAction } from "@/features/follows/actions";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifySellerOfInquiry } from "@/features/leads/notify";
import { sendTrackedEmail } from "@/lib/email/send";
import { DEMO_COPY } from "@/features/demo/constants";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const inquiry = {
  sellerId: uuid(10),
  propertyId: uuid(11),
  firstName: "Pat",
  lastName: "Buyer",
  email: "pat@example.test",
  phone: null,
  preferredContactMethod: "email",
  inquiryType: "question",
  buyingStage: "just_starting",
  agentStatus: "no",
  message: "Hi",
  idempotencyKey: uuid(12),
};

const rsvp = {
  openHouseId: uuid(20),
  firstName: "Pat",
  lastName: "Buyer",
  email: "pat@example.test",
  phone: null,
  partySize: 2,
  agentStatus: "prefer_not_to_say",
  message: null,
  idempotencyKey: uuid(21),
};

const writes = (calls: Call[]) => calls.filter((c) => ["insert", "update", "upsert", "delete"].includes(c.method));

beforeEach(() => {
  vi.clearAllMocks();
  state.demo = false;
  state.admin = fakeSupabase((table, own) => {
    if (own.some((c) => c.method === "insert")) return { data: { id: uuid(99) }, error: null };
    if (table === "open_houses") {
      return {
        data: { id: rsvp.openHouseId, status: "scheduled", starts_at: "2030-01-01T18:00:00Z", ends_at: "2030-01-01T20:00:00Z", properties: { title: "T", slug: "s", address_line_1: "1 A St", city: "Buffalo", state: "NY", seller_id: uuid(10) } },
        error: null,
      };
    }
    if (table === "seller_profiles") return { data: { user_id: uuid(1), is_demo: false }, error: null };
    return { data: null, error: null };
  });
  state.server = fakeSupabase(() => ({ data: null, error: null }));
});

describe("demo targets are rejected before any side effect", () => {
  beforeEach(() => {
    state.demo = true;
  });

  it("does not record an inquiry, rate-limit hit or notification", async () => {
    const res = await submitInquiryAction({ ...inquiry, honeypot: "" });
    expect(res).toEqual({ error: DEMO_COPY.actionError, demo: true });
    expect(writes(state.admin!.calls)).toEqual([]);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(notifySellerOfInquiry).not.toHaveBeenCalled();
  });

  it("does not fake success for a demo target even when the honeypot trips", async () => {
    const res = await submitInquiryAction({ ...inquiry, honeypot: "bot" });
    expect(res).toMatchObject({ demo: true });
  });

  it("does not record an RSVP or send a confirmation", async () => {
    const res = await submitRsvpAction({ ...rsvp });
    expect(res).toEqual({ error: DEMO_COPY.actionError, demo: true });
    expect(writes(state.admin!.calls)).toEqual([]);
    expect(sendTrackedEmail).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("does not save a demo listing", async () => {
    const res = await toggleSaveAction(uuid(11));
    expect(res).toEqual({ error: DEMO_COPY.actionError, demo: true });
    expect(writes(state.server!.calls)).toEqual([]);
  });

  it("does not follow a demo seller or change follow preferences", async () => {
    expect(await toggleFollowAction(uuid(10))).toEqual({ error: DEMO_COPY.actionError, demo: true });
    expect(await updateFollowPreferencesAction(uuid(10), { notifyNewProperties: true, notifyComingSoon: true, notifyOpenHouses: true })).toEqual({
      error: DEMO_COPY.actionError,
      demo: true,
    });
    expect(writes(state.server!.calls)).toEqual([]);
  });
});

describe("real targets keep working", () => {
  it("records an inquiry and notifies the seller", async () => {
    const res = await submitInquiryAction({ ...inquiry });
    expect(res).toEqual({ success: true, inquiryId: uuid(99) });
    expect(writes(state.admin!.calls).map((c) => c.table)).toEqual(["inquiries"]);
    expect(checkRateLimit).toHaveBeenCalled();
    expect(notifySellerOfInquiry).toHaveBeenCalled();
  });

  it("records an RSVP and sends the confirmation", async () => {
    const res = await submitRsvpAction({ ...rsvp });
    expect(res).toEqual({ success: true, rsvpId: uuid(99) });
    expect(writes(state.admin!.calls).map((c) => c.table)).toContain("open_house_rsvps");
    expect(sendTrackedEmail).toHaveBeenCalledWith(expect.objectContaining({ emailType: "rsvp_confirmation" }));
  });

  it("saves and follows", async () => {
    expect(await toggleSaveAction(uuid(11))).toEqual({ saved: true });
    expect(await toggleFollowAction(uuid(10))).toEqual({ following: true });
    expect(writes(state.server!.calls).map((c) => c.table)).toEqual(["property_saves", "seller_follows"]);
  });

  it("reports a database demo rejection honestly instead of a generic failure", async () => {
    state.server = fakeSupabase((_t, own) => (own.some((c) => c.method === "insert") ? { data: null, error: { code: "DM001", message: "DEMO_CONTENT" } } : { data: null, error: null }));
    expect(await toggleSaveAction(uuid(11))).toEqual({ error: DEMO_COPY.actionError, demo: true });
  });
});
