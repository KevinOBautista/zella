import { describe, expect, it } from "vitest";
import { activeSlotsAvailable, canActivateOneMore } from "@/features/seller-entitlements/domain";

describe("activeSlotsAvailable", () => {
  it("returns the default 5 slots when none are used", () => {
    expect(
      activeSlotsAvailable({ freeActiveListingLimit: 5, additionalListingSlots: 0 }, 0),
    ).toBe(5);
  });

  it("subtracts current active count", () => {
    expect(
      activeSlotsAvailable({ freeActiveListingLimit: 5, additionalListingSlots: 0 }, 3),
    ).toBe(2);
  });

  it("includes additional granted slots", () => {
    expect(
      activeSlotsAvailable({ freeActiveListingLimit: 5, additionalListingSlots: 2 }, 5),
    ).toBe(2);
  });

  it("never goes below zero", () => {
    expect(
      activeSlotsAvailable({ freeActiveListingLimit: 5, additionalListingSlots: 0 }, 9),
    ).toBe(0);
  });
});

describe("canActivateOneMore", () => {
  it("allows activating the 5th listing", () => {
    expect(
      canActivateOneMore({ freeActiveListingLimit: 5, additionalListingSlots: 0 }, 4),
    ).toBe(true);
  });

  it("blocks activating a 6th listing with no extra slots", () => {
    expect(
      canActivateOneMore({ freeActiveListingLimit: 5, additionalListingSlots: 0 }, 5),
    ).toBe(false);
  });

  it("allows a 6th listing when an admin granted one extra slot", () => {
    expect(
      canActivateOneMore({ freeActiveListingLimit: 5, additionalListingSlots: 1 }, 5),
    ).toBe(true);
  });
});
