import { describe, expect, it } from "vitest";
import { filterOwnProperties, toSellerCardData, type OwnPropertyRow } from "@/features/properties/seller-card";

function row(over: Partial<OwnPropertyRow> = {}): OwnPropertyRow {
  return {
    id: "p1",
    slug: "127-maple-road-amherst-ny",
    title: "Maple Road Colonial",
    listing_status: "for_sale",
    address_visibility: "full",
    address_line_1: "127 Maple Road",
    city: "Amherst",
    state: "NY",
    postal_code: "14226",
    asking_price_cents: 30_000_000,
    expected_price_min_cents: null,
    expected_price_max_cents: null,
    pricing_type: "asking_price",
    sold_price_cents: null,
    bedrooms: 3,
    full_bathrooms: 2,
    half_bathrooms: null,
    square_feet: 1500,
    property_type: "single_family",
    property_images: [{ storage_path: "a.jpg", is_cover: false, display_order: 2 }],
    ...over,
  };
}

describe("toSellerCardData", () => {
  it("prefers the cover image over display order", () => {
    const data = toSellerCardData(
      row({
        property_images: [
          { storage_path: "first.jpg", is_cover: false, display_order: 0 },
          { storage_path: "cover.jpg", is_cover: true, display_order: 5 },
        ],
      }),
    );
    expect(data.cover_image_path).toBe("cover.jpg");
  });

  it("falls back to the lowest display order when nothing is flagged as cover", () => {
    const data = toSellerCardData(
      row({
        property_images: [
          { storage_path: "second.jpg", is_cover: false, display_order: 3 },
          { storage_path: "first.jpg", is_cover: false, display_order: 1 },
        ],
      }),
    );
    expect(data.cover_image_path).toBe("first.jpg");
  });

  it("leaves the cover null when there are no photos", () => {
    expect(toSellerCardData(row({ property_images: [] })).cover_image_path).toBeNull();
  });

  it("redacts the address exactly like the public card for hidden-address listings", () => {
    const cityZip = toSellerCardData(row({ listing_status: "coming_soon", address_visibility: "city_zip" }));
    expect(cityZip.display_line).toBe("Amherst, NY 14226");
    expect(cityZip.display_line).not.toContain("Maple Road");
    const cityOnly = toSellerCardData(row({ address_visibility: "city_only" }));
    expect(cityOnly.display_line).toBe("Amherst, NY");
  });

  it("shows the full display line when the address is public", () => {
    expect(toSellerCardData(row()).display_line).toBe("127 Maple Road, Amherst, NY 14226");
  });

  it("says so rather than faking an address on an incomplete draft", () => {
    const data = toSellerCardData(row({ listing_status: "draft", address_line_1: null, city: null, state: null, postal_code: null }));
    expect(data.display_line).toBe("No address yet");
  });

  it("never zero-fills unknown specs", () => {
    const data = toSellerCardData(row({ bedrooms: null, full_bathrooms: null, square_feet: null }));
    expect(data.bedrooms).toBeNull();
    expect(data.square_feet).toBeNull();
  });

  it("keeps the slug null for a draft that has no public listing", () => {
    expect(toSellerCardData(row({ slug: null })).slug).toBeNull();
  });

  it("allows scheduling an open house only for public-address, live listings", () => {
    expect(toSellerCardData(row()).canScheduleOpenHouse).toBe(true);
    expect(toSellerCardData(row({ address_visibility: "city_zip" })).canScheduleOpenHouse).toBe(false);
    expect(toSellerCardData(row({ listing_status: "draft" })).canScheduleOpenHouse).toBe(false);
    expect(toSellerCardData(row({ listing_status: "archived" })).canScheduleOpenHouse).toBe(false);
  });
});

describe("filterOwnProperties", () => {
  const rows = [
    row({ id: "a", title: "Maple Road Colonial", city: "Amherst", address_line_1: "127 Maple Road", listing_status: "for_sale" }),
    row({ id: "b", title: "Lakeside Cottage", city: "Hamburg", address_line_1: "9 Shore Drive", listing_status: "draft" }),
    row({ id: "c", title: null, city: "Buffalo", address_line_1: "44 Elm Street", listing_status: "sold" }),
  ];

  it("filters by status, keeping drafts and sold reachable", () => {
    expect(filterOwnProperties(rows, { statuses: ["draft"] }).map((r) => r.id)).toEqual(["b"]);
    expect(filterOwnProperties(rows, { statuses: ["sold"] }).map((r) => r.id)).toEqual(["c"]);
  });

  it("searches title, street and city case-insensitively", () => {
    expect(filterOwnProperties(rows, { q: "maple" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterOwnProperties(rows, { q: "HAMBURG" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterOwnProperties(rows, { q: "elm" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("combines status and search", () => {
    expect(filterOwnProperties(rows, { statuses: ["for_sale"], q: "lakeside" })).toEqual([]);
  });

  it("returns everything when no filters are given", () => {
    expect(filterOwnProperties(rows, {})).toHaveLength(3);
  });
});
