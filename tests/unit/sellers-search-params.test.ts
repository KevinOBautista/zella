import { describe, expect, it } from "vitest";
import {
  buildSellersHref,
  hasActiveSellerFilters,
  parseSellersSearchParams,
  sellerFilterChips,
  toSellerFilters,
} from "@/features/sellers/search-params";

describe("parseSellersSearchParams", () => {
  it("returns defaults for an empty query", () => {
    const s = parseSellersSearchParams({});
    expect(s.page).toBe(1);
    expect(s.q).toBeUndefined();
    expect(s.hasHomes).toBeUndefined();
    expect(s.hasOpenHouses).toBeUndefined();
  });

  it("parses valid params and takes the first value of arrays", () => {
    const s = parseSellersSearchParams({ q: ["  Jane  ", "x"], hasHomes: "1", hasOpenHouses: "1", page: "2" });
    expect(s).toMatchObject({ q: "Jane", hasHomes: true, hasOpenHouses: true, page: 2 });
  });

  it("drops junk instead of throwing", () => {
    const s = parseSellersSearchParams({ hasHomes: "yes", hasOpenHouses: "true", page: "-3" });
    expect(s.hasHomes).toBeUndefined();
    expect(s.hasOpenHouses).toBeUndefined();
    expect(s.page).toBe(1);
  });

  it("caps q at 80 chars and drops whitespace-only queries", () => {
    expect(parseSellersSearchParams({ q: "a".repeat(200) }).q).toHaveLength(80);
    expect(parseSellersSearchParams({ q: "   " }).q).toBeUndefined();
  });
});

describe("toSellerFilters", () => {
  it("maps parsed search to query filters", () => {
    const f = toSellerFilters(parseSellersSearchParams({ q: "Jane", hasHomes: "1", page: "2" }));
    expect(f).toMatchObject({ q: "Jane", hasHomesForSale: true, hasUpcomingOpenHouses: false, page: 2 });
  });
  it("leaves absent values falsy/undefined", () => {
    const f = toSellerFilters(parseSellersSearchParams({}));
    expect(f.q).toBeUndefined();
    expect(f.hasHomesForSale).toBe(false);
    expect(f.hasUpcomingOpenHouses).toBe(false);
    expect(f.page).toBe(1);
  });
});

describe("buildSellersHref", () => {
  it("omits defaults and unknown params", () => {
    const s = parseSellersSearchParams({ page: "1", resume: "follow" });
    expect(buildSellersHref(s)).toBe("/sellers");
  });
  it("serializes active filters", () => {
    const s = parseSellersSearchParams({ q: "Jane", hasHomes: "1", hasOpenHouses: "1", page: "2" });
    const href = buildSellersHref(s);
    expect(href.startsWith("/sellers?")).toBe(true);
    const p = new URLSearchParams(href.slice("/sellers?".length));
    expect(p.get("q")).toBe("Jane");
    expect(p.get("hasHomes")).toBe("1");
    expect(p.get("hasOpenHouses")).toBe("1");
    expect(p.get("page")).toBe("2");
  });
  it("resets page when a filter is patched", () => {
    const s = parseSellersSearchParams({ q: "Jane", page: "4" });
    expect(buildSellersHref(s, { hasHomes: true })).not.toContain("page=");
  });
  it("keeps other filters when paging", () => {
    const s = parseSellersSearchParams({ q: "Jane" });
    expect(buildSellersHref(s, { page: 3 })).toBe("/sellers?q=Jane&page=3");
  });
  it("removes a filter when patched with undefined", () => {
    const s = parseSellersSearchParams({ q: "Jane", hasHomes: "1" });
    expect(buildSellersHref(s, { hasHomes: undefined })).toBe("/sellers?q=Jane");
  });
});

describe("hasActiveSellerFilters", () => {
  it("ignores page", () => {
    expect(hasActiveSellerFilters(parseSellersSearchParams({ page: "2" }))).toBe(false);
    expect(hasActiveSellerFilters(parseSellersSearchParams({ q: "x" }))).toBe(true);
    expect(hasActiveSellerFilters(parseSellersSearchParams({ hasHomes: "1" }))).toBe(true);
    expect(hasActiveSellerFilters(parseSellersSearchParams({ hasOpenHouses: "1" }))).toBe(true);
  });
});

describe("sellerFilterChips", () => {
  it("labels each filter and links to the search without it", () => {
    const s = parseSellersSearchParams({ q: "Jane", hasHomes: "1", hasOpenHouses: "1", page: "2" });
    const chips = sellerFilterChips(s);
    expect(chips.map((c) => c.label)).toEqual(["Jane", "Has homes for sale", "Has upcoming open houses"]);
    const homesChip = chips.find((c) => c.key === "hasHomes")!;
    expect(homesChip.href).not.toContain("hasHomes");
    expect(homesChip.href).toContain("q=Jane");
    expect(homesChip.href).not.toContain("page=");
  });
  it("is empty with no filters", () => {
    expect(sellerFilterChips(parseSellersSearchParams({}))).toEqual([]);
  });
});
