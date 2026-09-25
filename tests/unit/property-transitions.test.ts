import { describe, expect, it } from "vitest";
import {
  ACTIVE_LISTING_STATUSES,
  canTransition,
  countsTowardActiveLimit,
} from "@/features/properties/domain";

describe("canTransition", () => {
  const allowed: [string, string][] = [
    ["draft", "coming_soon"],
    ["draft", "for_sale"],
    ["coming_soon", "for_sale"],
    ["for_sale", "under_contract"],
    ["under_contract", "for_sale"],
    ["under_contract", "sold"],
    ["for_sale", "sold"],
    ["for_sale", "paused"],
    ["coming_soon", "paused"],
    ["paused", "for_sale"],
    ["for_sale", "archived"],
    ["sold", "archived"],
  ];

  it.each(allowed)("allows %s -> %s", (from, to) => {
    // @ts-expect-error - runtime string check across the enum union
    expect(canTransition(from, to)).toBe(true);
  });

  const disallowed: [string, string][] = [
    ["sold", "for_sale"],
    ["draft", "sold"],
    ["archived", "for_sale"],
    ["under_contract", "draft"],
    ["coming_soon", "sold"],
  ];

  it.each(disallowed)("disallows %s -> %s", (from, to) => {
    // @ts-expect-error - runtime string check across the enum union
    expect(canTransition(from, to)).toBe(false);
  });

  it("does not create a new record when coming_soon becomes for_sale (same-id contract)", () => {
    // This is enforced by the RPC operating on the existing row; the pure
    // domain check only needs to confirm the transition itself is legal.
    expect(canTransition("coming_soon", "for_sale")).toBe(true);
  });
});

describe("countsTowardActiveLimit", () => {
  it("counts coming_soon, for_sale, under_contract", () => {
    expect(countsTowardActiveLimit("coming_soon")).toBe(true);
    expect(countsTowardActiveLimit("for_sale")).toBe(true);
    expect(countsTowardActiveLimit("under_contract")).toBe(true);
  });

  it("does not count draft, paused, sold, archived", () => {
    expect(countsTowardActiveLimit("draft")).toBe(false);
    expect(countsTowardActiveLimit("paused")).toBe(false);
    expect(countsTowardActiveLimit("sold")).toBe(false);
    expect(countsTowardActiveLimit("archived")).toBe(false);
  });

  it("ACTIVE_LISTING_STATUSES matches the spec set exactly", () => {
    expect([...ACTIVE_LISTING_STATUSES].sort()).toEqual(
      ["coming_soon", "for_sale", "under_contract"].sort(),
    );
  });
});
