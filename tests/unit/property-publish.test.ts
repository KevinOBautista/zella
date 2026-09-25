import { describe, expect, it } from "vitest";
import { canPublish } from "@/features/properties/domain";

const validDraft = {
  addressLine1: "123 Elmwood Ave",
  city: "Buffalo",
  state: "NY",
  postalCode: "14201",
  propertyType: "single_family" as const,
  listingStatus: "for_sale" as const,
  pricingType: "asking_price" as const,
  askingPriceCents: 25_000_000,
  expectedPriceMinCents: null,
  expectedPriceMaxCents: null,
  photoCount: 5,
  publishAcknowledged: true,
};

describe("canPublish", () => {
  it("passes a complete for_sale draft", () => {
    expect(canPublish(validDraft)).toEqual({ ok: true });
  });

  it("requires at least one photo", () => {
    const result = canPublish({ ...validDraft, photoCount: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "photos")).toBe(true);
    }
  });

  it("requires an asking price when pricing_type is asking_price", () => {
    const result = canPublish({ ...validDraft, askingPriceCents: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "askingPriceCents")).toBe(true);
    }
  });

  it("requires min/max when pricing_type is expected_range", () => {
    const result = canPublish({
      ...validDraft,
      pricingType: "expected_range",
      askingPriceCents: null,
      expectedPriceMinCents: null,
      expectedPriceMaxCents: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "expectedPriceMinCents")).toBe(true);
      expect(result.errors.some((e) => e.field === "expectedPriceMaxCents")).toBe(true);
    }
  });

  it("allows price_undecided with no price fields set", () => {
    const result = canPublish({
      ...validDraft,
      listingStatus: "coming_soon",
      pricingType: "price_undecided",
      askingPriceCents: null,
      expectedPriceMinCents: null,
      expectedPriceMaxCents: null,
    });
    expect(result.ok).toBe(true);
  });

  it("requires the publish acknowledgement", () => {
    const result = canPublish({ ...validDraft, publishAcknowledged: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "publishAcknowledged")).toBe(true);
    }
  });

  it("requires core address fields", () => {
    const result = canPublish({ ...validDraft, addressLine1: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "addressLine1")).toBe(true);
    }
  });
});
