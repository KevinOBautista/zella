import { describe, expect, it } from "vitest";
import {
  canScheduleOpenHouse,
  deriveOpenHouseState,
  validateOpenHouseWindow,
} from "@/features/open-houses/domain";

const NOW = new Date("2026-01-08T17:00:00.000Z");

describe("validateOpenHouseWindow", () => {
  it("passes a valid future window", () => {
    const errors = validateOpenHouseWindow({
      startsAt: new Date("2026-01-10T17:00:00.000Z"),
      endsAt: new Date("2026-01-10T21:00:00.000Z"),
      now: NOW,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects end time before start time", () => {
    const errors = validateOpenHouseWindow({
      startsAt: new Date("2026-01-10T21:00:00.000Z"),
      endsAt: new Date("2026-01-10T17:00:00.000Z"),
      now: NOW,
    });
    expect(errors.some((e) => e.field === "endsAt")).toBe(true);
  });

  it("rejects a start time in the past", () => {
    const errors = validateOpenHouseWindow({
      startsAt: new Date("2026-01-01T17:00:00.000Z"),
      endsAt: new Date("2026-01-01T21:00:00.000Z"),
      now: NOW,
    });
    expect(errors.some((e) => e.field === "startsAt")).toBe(true);
  });
});

describe("canScheduleOpenHouse", () => {
  it("allows scheduling on a for_sale property with full address visibility", () => {
    expect(
      canScheduleOpenHouse({ addressVisibility: "full", listingStatus: "for_sale" }),
    ).toEqual({ ok: true });
  });

  it("blocks scheduling when address visibility is not full", () => {
    const result = canScheduleOpenHouse({
      addressVisibility: "city_zip",
      listingStatus: "for_sale",
    });
    expect(result.ok).toBe(false);
  });

  it("blocks scheduling on a sold or cancelled-equivalent property", () => {
    const result = canScheduleOpenHouse({ addressVisibility: "full", listingStatus: "sold" });
    expect(result.ok).toBe(false);
  });
});

describe("deriveOpenHouseState", () => {
  it("is cancelled when status is cancelled regardless of time", () => {
    expect(
      deriveOpenHouseState(
        { status: "cancelled", endsAt: new Date("2026-01-10T21:00:00.000Z") },
        NOW,
      ),
    ).toBe("cancelled");
  });

  it("is upcoming when scheduled and ends in the future", () => {
    expect(
      deriveOpenHouseState(
        { status: "scheduled", endsAt: new Date("2026-01-10T21:00:00.000Z") },
        NOW,
      ),
    ).toBe("upcoming");
  });

  it("is past when scheduled but ends in the past", () => {
    expect(
      deriveOpenHouseState(
        { status: "scheduled", endsAt: new Date("2026-01-01T21:00:00.000Z") },
        NOW,
      ),
    ).toBe("past");
  });
});
