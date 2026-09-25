import { describe, expect, it } from "vitest";
import { groupOpenHousesByDate, isUpcoming } from "@/lib/dates";

const TZ = "America/New_York";

// Thursday, Jan 8, 2026, 12:00 ET
const NOW = new Date("2026-01-08T17:00:00.000Z");

describe("groupOpenHousesByDate", () => {
  it("groups an event this Saturday", () => {
    const saturday = new Date("2026-01-10T18:00:00.000Z"); // Sat 1pm ET
    const groups = groupOpenHousesByDate([{ startsAt: saturday }], NOW, TZ);
    expect(groups.map((g) => g.label)).toContain("This Saturday");
    expect(groups.find((g) => g.label === "This Saturday")?.events).toHaveLength(1);
  });

  it("groups an event this Sunday", () => {
    const sunday = new Date("2026-01-11T18:00:00.000Z");
    const groups = groupOpenHousesByDate([{ startsAt: sunday }], NOW, TZ);
    expect(groups.map((g) => g.label)).toContain("This Sunday");
  });

  it("groups an event next weekend separately from this weekend", () => {
    const nextSaturday = new Date("2026-01-17T18:00:00.000Z");
    const groups = groupOpenHousesByDate([{ startsAt: nextSaturday }], NOW, TZ);
    expect(groups.map((g) => g.label)).toContain("Next Weekend");
  });

  it("puts far-future events in Later", () => {
    const farFuture = new Date("2026-03-01T18:00:00.000Z");
    const groups = groupOpenHousesByDate([{ startsAt: farFuture }], NOW, TZ);
    expect(groups.map((g) => g.label)).toContain("Later");
  });

  it("omits empty groups", () => {
    const groups = groupOpenHousesByDate([], NOW, TZ);
    expect(groups).toHaveLength(0);
  });
});

describe("isUpcoming", () => {
  it("is true when end time is after now", () => {
    expect(isUpcoming(new Date("2026-01-10T18:00:00.000Z"), NOW)).toBe(true);
  });

  it("is false when end time has passed", () => {
    expect(isUpcoming(new Date("2026-01-01T18:00:00.000Z"), NOW)).toBe(false);
  });
});
