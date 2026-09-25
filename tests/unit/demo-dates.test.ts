// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildOpenHouseTimes, groupLabelsFor, parseReferenceDate, todayInZone } from "@scripts/demo/dates";
import { groupOpenHousesByDate } from "@/lib/dates";

const TZ = "America/New_York";

describe("parseReferenceDate", () => {
  it("accepts a real calendar date", () => {
    expect(parseReferenceDate("2026-09-16")).toEqual({ year: 2026, month: 9, day: 16 });
  });

  it.each(["2026-02-30", "2026-13-01", "16-09-2026", "2026-9-16", "", "tomorrow"])("rejects %s", (value) => {
    expect(() => parseReferenceDate(value)).toThrow(/reference date/i);
  });
});

describe("todayInZone", () => {
  it("uses the New York calendar date, not UTC", () => {
    // 02:30 UTC on Sep 17 is still Sep 16 in New York.
    expect(todayInZone(new Date("2026-09-17T02:30:00Z"), TZ)).toBe("2026-09-16");
  });
});

describe("buildOpenHouseTimes", () => {
  it("builds local afternoon times during daylight time", () => {
    const { startsAt, endsAt } = buildOpenHouseTimes("2026-09-16", { dayOffset: 1, startLocal: "17:00", durationMinutes: 120 }, TZ);
    expect(startsAt.toISOString()).toBe("2026-09-17T21:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-09-17T23:00:00.000Z");
  });

  it("keeps 1 PM local across the November daylight-saving change", () => {
    const before = buildOpenHouseTimes("2026-10-30", { dayOffset: 0, startLocal: "13:00", durationMinutes: 120 }, TZ);
    const after = buildOpenHouseTimes("2026-10-30", { dayOffset: 2, startLocal: "13:00", durationMinutes: 120 }, TZ);
    expect(before.startsAt.toISOString()).toBe("2026-10-30T17:00:00.000Z");
    expect(after.startsAt.toISOString()).toBe("2026-11-01T18:00:00.000Z");
  });

  it("keeps 1 PM local across the March daylight-saving change", () => {
    const before = buildOpenHouseTimes("2027-03-12", { dayOffset: 0, startLocal: "13:00", durationMinutes: 90 }, TZ);
    const after = buildOpenHouseTimes("2027-03-12", { dayOffset: 2, startLocal: "13:00", durationMinutes: 90 }, TZ);
    expect(before.startsAt.toISOString()).toBe("2027-03-12T18:00:00.000Z");
    expect(after.startsAt.toISOString()).toBe("2027-03-14T17:00:00.000Z");
    expect(after.endsAt.toISOString()).toBe("2027-03-14T18:30:00.000Z");
  });

  it("rolls over month and year boundaries", () => {
    const { startsAt } = buildOpenHouseTimes("2026-12-30", { dayOffset: 3, startLocal: "11:30", durationMinutes: 60 }, TZ);
    expect(startsAt.toISOString()).toBe("2027-01-02T16:30:00.000Z");
  });

  it.each([
    { dayOffset: -1, startLocal: "13:00", durationMinutes: 60 },
    { dayOffset: 1, startLocal: "25:00", durationMinutes: 60 },
    { dayOffset: 1, startLocal: "02:30", durationMinutes: 60 },
    { dayOffset: 1, startLocal: "13:00", durationMinutes: 0 },
  ])("rejects an invalid template %o", (template) => {
    expect(() => buildOpenHouseTimes("2026-09-16", template, TZ)).toThrow();
  });
});

describe("groupLabelsFor", () => {
  const templates = [
    { dayOffset: 1, startLocal: "17:00", durationMinutes: 120 },
    { dayOffset: 2, startLocal: "17:00", durationMinutes: 120 },
    { dayOffset: 12, startLocal: "17:00", durationMinutes: 120 },
    { dayOffset: 17, startLocal: "13:00", durationMinutes: 120 },
  ];

  it("includes This Week and Later when refreshed on a Wednesday", () => {
    expect(groupLabelsFor("2026-09-16", templates, TZ)).toEqual(expect.arrayContaining(["This Week", "Later"]));
  });

  it("reports that a Saturday refresh cannot produce This Week", () => {
    expect(groupLabelsFor("2026-09-19", templates, TZ)).not.toContain("This Week");
  });
});

describe("groupOpenHousesByDate across boundaries", () => {
  it("treats Sunday 11:30 PM ET as Sunday even though it is Monday in UTC", () => {
    const now = new Date("2026-09-16T13:00:00Z"); // Wed 9 AM ET
    const groups = groupOpenHousesByDate([{ startsAt: new Date("2026-09-21T03:30:00Z") }], now, TZ);
    expect(groups.map((g) => g.label)).toEqual(["This Sunday"]);
  });

  it("groups correctly across the November daylight-saving change", () => {
    const now = new Date("2026-10-30T13:00:00Z"); // Fri 9 AM EDT
    const groups = groupOpenHousesByDate(
      [
        { startsAt: new Date("2026-11-01T18:00:00Z") }, // Sun 1 PM EST
        { startsAt: new Date("2026-11-07T18:00:00Z") }, // next Sat
        { startsAt: new Date("2026-10-30T21:00:00Z") }, // today 5 PM
      ],
      now,
      TZ,
    );
    expect(groups.map((g) => g.label)).toEqual(["This Week", "This Sunday", "Next Weekend"]);
  });

  it("groups correctly across the March daylight-saving change", () => {
    const now = new Date("2027-03-11T14:00:00Z"); // Thu 9 AM EST
    const groups = groupOpenHousesByDate(
      [
        { startsAt: new Date("2027-03-14T17:00:00Z") }, // Sun 1 PM EDT
        { startsAt: new Date("2027-03-25T17:00:00Z") }, // Later
      ],
      now,
      TZ,
    );
    expect(groups.map((g) => g.label)).toEqual(["This Sunday", "Later"]);
  });

  it("moves an event from Next Weekend to This Saturday once the week turns over", () => {
    const event = { startsAt: new Date("2026-09-26T17:00:00Z") }; // Sat Sep 26 1 PM
    expect(groupOpenHousesByDate([event], new Date("2026-09-18T13:00:00Z"), TZ)[0]!.label).toBe("Next Weekend");
    expect(groupOpenHousesByDate([event], new Date("2026-09-21T13:00:00Z"), TZ)[0]!.label).toBe("This Saturday");
  });
});
