import { describe, expect, it } from "vitest";
import { buildPropertySlug, resolveSlugCollision, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("123 Elmwood Avenue")).toBe("123-elmwood-avenue");
  });

  it("strips punctuation", () => {
    expect(slugify("O'Brien's Farm, Unit #4")).toBe("obriens-farm-unit-4");
  });

  it("collapses repeated separators and trims edges", () => {
    expect(slugify("  --Buffalo,  NY--  ")).toBe("buffalo-ny");
  });
});

describe("buildPropertySlug", () => {
  it("builds address-city-state slug", () => {
    expect(buildPropertySlug("123 Elmwood Avenue", "Buffalo", "NY")).toBe(
      "123-elmwood-avenue-buffalo-ny",
    );
  });
});

describe("resolveSlugCollision", () => {
  it("returns the base when there is no collision", () => {
    expect(resolveSlugCollision("123-elmwood-avenue-buffalo-ny", [])).toBe(
      "123-elmwood-avenue-buffalo-ny",
    );
  });

  it("appends -2 on first collision", () => {
    expect(
      resolveSlugCollision("123-elmwood-avenue-buffalo-ny", [
        "123-elmwood-avenue-buffalo-ny",
      ]),
    ).toBe("123-elmwood-avenue-buffalo-ny-2");
  });

  it("finds the next free suffix", () => {
    const existing = [
      "123-elmwood-avenue-buffalo-ny",
      "123-elmwood-avenue-buffalo-ny-2",
      "123-elmwood-avenue-buffalo-ny-3",
    ];
    expect(resolveSlugCollision("123-elmwood-avenue-buffalo-ny", existing)).toBe(
      "123-elmwood-avenue-buffalo-ny-4",
    );
  });
});
