import { describe, expect, it } from "vitest";
import { toPublicAddress } from "@/features/properties/domain";

const base = {
  addressLine1: "127 Maple Road",
  addressLine2: "Unit 3",
  city: "Amherst",
  state: "NY",
  postalCode: "14226",
  latitude: 42.9784,
  longitude: -78.7997,
};

describe("toPublicAddress", () => {
  it("full visibility exposes the complete address", () => {
    const result = toPublicAddress({ ...base, addressVisibility: "full" });
    expect(result).toEqual({
      addressLine1: "127 Maple Road",
      addressLine2: "Unit 3",
      city: "Amherst",
      state: "NY",
      postalCode: "14226",
      latitude: 42.9784,
      longitude: -78.7997,
      displayLine: "127 Maple Road, Amherst, NY 14226",
    });
  });

  it("city_zip visibility hides street line and coordinates", () => {
    const result = toPublicAddress({ ...base, addressVisibility: "city_zip" });
    expect(result.addressLine1).toBeNull();
    expect(result.addressLine2).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.city).toBe("Amherst");
    expect(result.postalCode).toBe("14226");
    expect(result.displayLine).toBe("Amherst, NY 14226");
  });

  it("city_only visibility hides street, postal code, and coordinates", () => {
    const result = toPublicAddress({ ...base, addressVisibility: "city_only" });
    expect(result.addressLine1).toBeNull();
    expect(result.postalCode).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.displayLine).toBe("Amherst, NY");
  });

  it("never leaks the street address string anywhere in the redacted object", () => {
    const result = toPublicAddress({ ...base, addressVisibility: "city_only" });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("127 Maple Road");
  });
});
