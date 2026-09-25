import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  buildHomesHref,
  hasActiveFilters,
  isFeaturedEligible,
  parseHomesSearchParams,
  pickNextOpenHouse,
  resultsHeading,
  sanitizeSearchTerm,
  splitFeatured,
  toSearchFilters,
  validateSearchForm,
} from "@/features/properties/search-params";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";

describe("parseHomesSearchParams", () => {
  it("returns defaults for an empty query", () => {
    const s = parseHomesSearchParams({});
    expect(s.sort).toBe("newest");
    expect(s.page).toBe(1);
    expect(s.q).toBeUndefined();
  });

  it("parses valid params and takes the first value of arrays", () => {
    const s = parseHomesSearchParams({
      q: ["  Buffalo ", "x"],
      minPrice: "250000",
      maxPrice: "400000",
      bedrooms: "3",
      bathrooms: "2",
      minSqft: "1500",
      propertyType: "condo",
      status: "coming_soon",
      openHouse: "1",
      sort: "price_asc",
      page: "3",
    });
    expect(s).toMatchObject({
      q: "Buffalo",
      minPrice: 250000,
      maxPrice: 400000,
      bedrooms: 3,
      bathrooms: 2,
      minSqft: 1500,
      propertyType: "condo",
      status: "coming_soon",
      openHouse: true,
      sort: "price_asc",
      page: 3,
    });
  });

  it("drops junk instead of throwing", () => {
    const s = parseHomesSearchParams({
      minPrice: "abc",
      bedrooms: "99",
      propertyType: "castle",
      status: "under_contract",
      sort: "random",
      page: "-4",
      openHouse: "yes",
    });
    expect(s.minPrice).toBeUndefined();
    expect(s.bedrooms).toBeUndefined();
    expect(s.propertyType).toBeUndefined();
    expect(s.status).toBeUndefined();
    expect(s.sort).toBe("newest");
    expect(s.page).toBe(1);
    expect(s.openHouse).toBeUndefined();
  });

  it("swaps an inverted min/max price so shared links still work", () => {
    const s = parseHomesSearchParams({ minPrice: "500000", maxPrice: "100000" });
    expect(s.minPrice).toBe(100000);
    expect(s.maxPrice).toBe(500000);
  });

  it("caps q at 80 chars", () => {
    const s = parseHomesSearchParams({ q: "a".repeat(200) });
    expect(s.q).toHaveLength(80);
  });
});

describe("toSearchFilters", () => {
  it("converts dollars to cents and openHouse to a boolean", () => {
    const f = toSearchFilters(parseHomesSearchParams({ minPrice: "250000", maxPrice: "400000", openHouse: "1", minSqft: "900" }));
    expect(f.minPriceCents).toBe(25_000_000);
    expect(f.maxPriceCents).toBe(40_000_000);
    expect(f.openHouseOnly).toBe(true);
    expect(f.minSqft).toBe(900);
  });
  it("leaves absent values undefined", () => {
    const f = toSearchFilters(parseHomesSearchParams({}));
    expect(f.minPriceCents).toBeUndefined();
    expect(f.openHouseOnly).toBe(false);
    expect(f.sort).toBe("newest");
    expect(f.page).toBe(1);
  });
});

describe("buildHomesHref", () => {
  it("omits defaults and unknown params such as the auth resume marker", () => {
    const s = parseHomesSearchParams({ sort: "newest", page: "1", resume: "save" });
    expect(buildHomesHref(s)).toBe("/homes");
  });
  it("serializes active filters", () => {
    const s = parseHomesSearchParams({ q: "Buffalo", bedrooms: "3", openHouse: "1", sort: "price_desc", page: "2" });
    const href = buildHomesHref(s);
    expect(href.startsWith("/homes?")).toBe(true);
    const p = new URLSearchParams(href.slice("/homes?".length));
    expect(p.get("q")).toBe("Buffalo");
    expect(p.get("bedrooms")).toBe("3");
    expect(p.get("openHouse")).toBe("1");
    expect(p.get("sort")).toBe("price_desc");
    expect(p.get("page")).toBe("2");
  });
  it("resets page when any filter is patched", () => {
    const s = parseHomesSearchParams({ q: "Buffalo", page: "4" });
    expect(buildHomesHref(s, { bedrooms: 2 })).not.toContain("page=");
    expect(buildHomesHref(s, { sort: "price_asc" })).not.toContain("page=");
  });
  it("keeps other filters when paging", () => {
    const s = parseHomesSearchParams({ q: "Buffalo" });
    expect(buildHomesHref(s, { page: 3 })).toBe("/homes?q=Buffalo&page=3");
  });
  it("removes a filter when patched with undefined", () => {
    const s = parseHomesSearchParams({ q: "Buffalo", bedrooms: "3" });
    expect(buildHomesHref(s, { bedrooms: undefined })).toBe("/homes?q=Buffalo");
  });
});

describe("hasActiveFilters / isFeaturedEligible", () => {
  it("ignores sort and page", () => {
    expect(hasActiveFilters(parseHomesSearchParams({ sort: "price_asc", page: "2" }))).toBe(false);
    expect(hasActiveFilters(parseHomesSearchParams({ q: "x" }))).toBe(true);
    expect(hasActiveFilters(parseHomesSearchParams({ openHouse: "1" }))).toBe(true);
  });
  it("featured only on the unfiltered first page with default sort", () => {
    expect(isFeaturedEligible(parseHomesSearchParams({}))).toBe(true);
    expect(isFeaturedEligible(parseHomesSearchParams({ page: "2" }))).toBe(false);
    expect(isFeaturedEligible(parseHomesSearchParams({ sort: "price_asc" }))).toBe(false);
    expect(isFeaturedEligible(parseHomesSearchParams({ q: "Buffalo" }))).toBe(false);
  });
});

describe("activeFilterChips", () => {
  it("labels each filter and links to the search without it", () => {
    const s = parseHomesSearchParams({
      q: "Buffalo",
      minPrice: "250000",
      maxPrice: "400000",
      bedrooms: "3",
      bathrooms: "2",
      minSqft: "1500",
      propertyType: "condo",
      status: "coming_soon",
      openHouse: "1",
      page: "3",
    });
    const chips = activeFilterChips(s);
    const labels = chips.map((c) => c.label);
    expect(labels).toEqual([
      "Buffalo",
      "Min $250,000",
      "Max $400,000",
      "3+ beds",
      "2+ baths",
      "1,500+ sqft",
      "Condo",
      "Coming soon",
      "Upcoming open house",
    ]);
    const beds = chips.find((c) => c.key === "bedrooms")!;
    expect(beds.href).not.toContain("bedrooms");
    expect(beds.href).toContain("q=Buffalo");
    expect(beds.href).not.toContain("page=");
  });
  it("is empty with no filters", () => {
    expect(activeFilterChips(parseHomesSearchParams({}))).toEqual([]);
  });
});

describe("resultsHeading", () => {
  it("names the location when q is set", () => {
    expect(resultsHeading(parseHomesSearchParams({ q: "buffalo" }))).toBe("Homes in Buffalo");
    expect(resultsHeading(parseHomesSearchParams({ q: "14222" }))).toBe("Homes in 14222");
  });
  it("uses factual labels otherwise", () => {
    expect(resultsHeading(parseHomesSearchParams({}))).toBe("Latest homes");
    expect(resultsHeading(parseHomesSearchParams({ bedrooms: "3" }))).toBe("Matching homes");
  });
});

describe("validateSearchForm", () => {
  it("flags max below min", () => {
    const r = validateSearchForm({ minPrice: "400000", maxPrice: "250000" });
    expect(r.fieldErrors.maxPrice).toMatch(/max/i);
  });
  it("flags non-numeric prices", () => {
    const r = validateSearchForm({ minPrice: "abc", maxPrice: "" });
    expect(r.fieldErrors.minPrice).toBeTruthy();
  });
  it("accepts formatted dollars and empty values", () => {
    expect(validateSearchForm({ minPrice: "$250,000", maxPrice: "" }).fieldErrors).toEqual({});
    expect(validateSearchForm({ minPrice: "", maxPrice: "" }).fieldErrors).toEqual({});
  });
});

describe("sanitizeSearchTerm", () => {
  it("strips PostgREST filter grammar characters", () => {
    expect(sanitizeSearchTerm("a,b(c)\"d'e\\f")).toBe("abcdef");
  });
  it("escapes LIKE wildcards", () => {
    expect(sanitizeSearchTerm("50%_x")).toBe("50\\%\\_x");
  });
  it("collapses whitespace, trims and caps length", () => {
    expect(sanitizeSearchTerm("  Buf   falo  ")).toBe("Buf falo");
    expect(sanitizeSearchTerm("a".repeat(100))).toHaveLength(80);
    expect(sanitizeSearchTerm("   ")).toBe("");
  });
});

function card(over: Partial<PropertyCardData>): PropertyCardData {
  return {
    id: over.id ?? "p1",
    slug: over.slug ?? "p1",
    listing_status: "for_sale",
    asking_price_cents: 30_000_000,
    expected_price_min_cents: null,
    expected_price_max_cents: null,
    pricing_type: "asking_price",
    sold_price_cents: null,
    display_line: "Buffalo, NY",
    bedrooms: 3,
    full_bathrooms: 2,
    square_feet: 1500,
    cover_image_path: "x/cover.jpg",
    has_upcoming_open_house: false,
    seller_username: "seller",
    ...over,
  };
}

describe("splitFeatured", () => {
  it("picks the first non-sold listing with a photo and removes it from the rest", () => {
    const list = [
      card({ id: "sold", listing_status: "sold" }),
      card({ id: "nophoto", cover_image_path: null }),
      card({ id: "pick" }),
      card({ id: "other" }),
    ];
    const { featured, rest } = splitFeatured(list);
    expect(featured?.id).toBe("pick");
    expect(rest.map((p) => p.id)).toEqual(["sold", "nophoto", "other"]);
  });
  it("returns null and the original list when nothing is eligible", () => {
    const list = [card({ id: "sold", listing_status: "sold" })];
    const { featured, rest } = splitFeatured(list);
    expect(featured).toBeNull();
    expect(rest).toEqual(list);
  });
});

describe("pickNextOpenHouse", () => {
  it("keeps the earliest upcoming open house per property", () => {
    const map = pickNextOpenHouse([
      { property_id: "a", starts_at: "2026-09-20T17:00:00Z", ends_at: "2026-09-20T20:00:00Z" },
      { property_id: "a", starts_at: "2026-09-27T17:00:00Z", ends_at: "2026-09-27T20:00:00Z" },
      { property_id: "b", starts_at: "2026-09-21T17:00:00Z", ends_at: "2026-09-21T20:00:00Z" },
    ]);
    expect(map.get("a")?.starts_at).toBe("2026-09-20T17:00:00Z");
    expect(map.get("b")?.starts_at).toBe("2026-09-21T17:00:00Z");
    expect(map.size).toBe(2);
  });
  it("ignores rows with null fields", () => {
    const map = pickNextOpenHouse([{ property_id: null, starts_at: "x", ends_at: "y" }]);
    expect(map.size).toBe(0);
  });
});
