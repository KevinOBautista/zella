import { describe, expect, it } from "vitest";
import { rsvpSchema } from "@/features/open-houses/schemas";

const base = {
  openHouseId: "11111111-1111-1111-1111-111111111111",
  firstName: "Alex",
  lastName: "Chen",
  email: "alex@example.com",
  phone: null,
  partySize: 2,
  agentStatus: "not_working_with_agent" as const,
  message: null,
  idempotencyKey: "22222222-2222-2222-2222-222222222222",
};

describe("rsvpSchema", () => {
  it("accepts a minimal valid RSVP", () => {
    expect(rsvpSchema.safeParse(base).success).toBe(true);
  });

  it("requires party size to be at least 1", () => {
    expect(rsvpSchema.safeParse({ ...base, partySize: 0 }).success).toBe(false);
  });

  it("rejects an unreasonably large party size", () => {
    expect(rsvpSchema.safeParse({ ...base, partySize: 500 }).success).toBe(false);
  });

  it("normalizes email to lowercase and trims names", () => {
    const result = rsvpSchema.safeParse({
      ...base,
      email: "ALEX@EXAMPLE.COM",
      firstName: "  Alex  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("alex@example.com");
      expect(result.data.firstName).toBe("Alex");
    }
  });

  it("rejects an invalid agentStatus", () => {
    expect(rsvpSchema.safeParse({ ...base, agentStatus: "maybe" }).success).toBe(false);
  });
});
