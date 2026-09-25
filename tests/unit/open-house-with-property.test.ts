import { describe, expect, it } from "vitest";
import { mergeOpenHousesWithProperties, type OpenHouseRow } from "@/features/open-houses/merge";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";

function openHouse(over: Partial<OpenHouseRow> = {}): OpenHouseRow {
  return {
    id: "oh1",
    property_id: "p1",
    starts_at: "2026-09-20T17:00:00Z",
    ends_at: "2026-09-20T20:00:00Z",
    ...over,
  } as OpenHouseRow;
}

function property(over: Partial<PropertyCardData> = {}): PropertyCardData {
  return {
    id: "p1",
    slug: "p1-slug",
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
    cover_image_path: null,
    has_upcoming_open_house: true,
    seller_username: "seller",
    ...over,
  };
}

describe("mergeOpenHousesWithProperties", () => {
  it("pairs each open house with its property", () => {
    const merged = mergeOpenHousesWithProperties([openHouse()], [property()]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.openHouse.id).toBe("oh1");
    expect(merged[0]!.property.id).toBe("p1");
  });

  it("keeps multiple events for the same property as separate entries", () => {
    const merged = mergeOpenHousesWithProperties(
      [openHouse({ id: "oh1", starts_at: "2026-09-20T17:00:00Z" }), openHouse({ id: "oh2", starts_at: "2026-09-27T17:00:00Z" })],
      [property()],
    );
    expect(merged.map((m) => m.openHouse.id)).toEqual(["oh1", "oh2"]);
    expect(merged.every((m) => m.property.id === "p1")).toBe(true);
  });

  it("drops an event whose property could not be found", () => {
    const merged = mergeOpenHousesWithProperties([openHouse({ property_id: "missing" })], [property()]);
    expect(merged).toHaveLength(0);
  });

  it("drops an event with no property_id", () => {
    const merged = mergeOpenHousesWithProperties([openHouse({ property_id: null })], [property()]);
    expect(merged).toHaveLength(0);
  });

  it("preserves input order", () => {
    const merged = mergeOpenHousesWithProperties(
      [openHouse({ id: "b", property_id: "p2" }), openHouse({ id: "a", property_id: "p1" })],
      [property({ id: "p1" }), property({ id: "p2" })],
    );
    expect(merged.map((m) => m.openHouse.id)).toEqual(["b", "a"]);
  });
});
