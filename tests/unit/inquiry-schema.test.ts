import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/features/leads/schemas";

const base = {
  sellerId: "11111111-1111-1111-1111-111111111111",
  propertyId: null,
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  phone: null,
  preferredContactMethod: "email" as const,
  inquiryType: "question" as const,
  buyingStage: "just_starting" as const,
  agentStatus: "no" as const,
  message: "Is this still available?",
  idempotencyKey: "22222222-2222-2222-2222-222222222222",
};

describe("inquirySchema", () => {
  it("accepts a valid email-preferred inquiry with no phone", () => {
    expect(inquirySchema.safeParse(base).success).toBe(true);
  });

  it("requires phone when preferred contact is phone", () => {
    const result = inquirySchema.safeParse({
      ...base,
      preferredContactMethod: "phone",
      phone: null,
    });
    expect(result.success).toBe(false);
  });

  it("requires phone when preferred contact is text", () => {
    const result = inquirySchema.safeParse({
      ...base,
      preferredContactMethod: "text",
      phone: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts phone-preferred contact when phone is provided", () => {
    const result = inquirySchema.safeParse({
      ...base,
      preferredContactMethod: "phone",
      phone: "716-555-0100",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase", () => {
    const result = inquirySchema.safeParse({ ...base, email: "JAMIE@EXAMPLE.COM" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jamie@example.com");
    }
  });

  it("rejects a missing required email", () => {
    const result = inquirySchema.safeParse({ ...base, email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid inquiryType enum value", () => {
    const result = inquirySchema.safeParse({ ...base, inquiryType: "not_a_type" });
    expect(result.success).toBe(false);
  });

  it("does not include any protected-class field", () => {
    const shape = Object.keys(inquirySchema.shape);
    for (const forbidden of ["race", "religion", "disability", "familialStatus", "nationalOrigin", "gender", "sexualOrientation"]) {
      expect(shape).not.toContain(forbidden);
    }
  });
});
