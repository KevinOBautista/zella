import { describe, expect, it } from "vitest";
import { formatOpenHouseDateTimeZoned, formatOpenHouseShort } from "@/features/open-houses/format";

describe("formatOpenHouseShort", () => {
  it("formats a same-meridiem window compactly in Eastern time", () => {
    // 1–4 PM EDT on Sun Sep 20 2026
    expect(formatOpenHouseShort("2026-09-20T17:00:00Z", "2026-09-20T20:00:00Z")).toBe("Sun, Sep 20 · 1–4 PM");
  });
  it("keeps both meridiems when they differ", () => {
    // 11 AM – 1 PM EDT
    expect(formatOpenHouseShort("2026-09-20T15:00:00Z", "2026-09-20T17:00:00Z")).toBe("Sun, Sep 20 · 11 AM–1 PM");
  });
  it("includes minutes when not on the hour", () => {
    expect(formatOpenHouseShort("2026-09-20T17:30:00Z", "2026-09-20T19:00:00Z")).toBe("Sun, Sep 20 · 1:30–3 PM");
  });
});

describe("formatOpenHouseDateTimeZoned", () => {
  it("appends the local time zone label to the full date/time", () => {
    expect(formatOpenHouseDateTimeZoned("2026-09-20T17:00:00Z", "2026-09-20T20:00:00Z")).toBe(
      "Sunday, September 20, 1:00 PM – 4:00 PM ET",
    );
  });
  it("allows a custom zone label", () => {
    expect(formatOpenHouseDateTimeZoned("2026-09-20T17:00:00Z", "2026-09-20T20:00:00Z", "EDT")).toMatch(/EDT$/);
  });
});
