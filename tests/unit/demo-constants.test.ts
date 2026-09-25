import { describe, expect, it } from "vitest";
import { DEMO_COPY, isDemoContentError } from "@/features/demo/constants";

describe("isDemoContentError", () => {
  it("recognizes the database demo error by SQLSTATE or message", () => {
    expect(isDemoContentError({ code: "DM001", message: "anything" })).toBe(true);
    expect(isDemoContentError({ code: "P0001", message: "DEMO_CONTENT" })).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isDemoContentError({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isDemoContentError(null)).toBe(false);
  });
});

describe("DEMO_COPY", () => {
  it("uses the exact required notices", () => {
    expect(DEMO_COPY.propertyNotice).toBe("Sample listing. This property is not available for purchase.");
    expect(DEMO_COPY.sellerNotice).toBe("This is a demo seller profile created to show how the platform works.");
    expect(DEMO_COPY.eventNotice).toBe("Demo event. No in-person open house is scheduled.");
    expect(DEMO_COPY.galleryLabel).toBe("Illustrative photos for a demo listing.");
  });

  it("never implies an action succeeded", () => {
    for (const text of Object.values(DEMO_COPY)) {
      expect(text).not.toMatch(/\b(sent!|saved!|success|you're registered|following now)\b/i);
    }
  });
});
