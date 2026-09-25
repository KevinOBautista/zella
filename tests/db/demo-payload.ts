/** A tiny, fixed demo payload for database tests (not the real dataset). */
export const TEST_DATASET = "test-demo";

export const ids = {
  seller: "00000000-0000-4000-8000-00000000d001",
  property: "00000000-0000-4000-8000-00000000d101",
  comingSoon: "00000000-0000-4000-8000-00000000d102",
  image: "00000000-0000-4000-8000-00000000d201",
  image2: "00000000-0000-4000-8000-00000000d202",
  openHouse: "00000000-0000-4000-8000-00000000d301",
};

export const paths = {
  image: `demo/${TEST_DATASET}/home-a/aaaa-exterior_front.webp`,
  image2: `demo/${TEST_DATASET}/home-a/bbbb-kitchen.webp`,
};

export function demoPayload(overrides: { openHouseStartsAt?: string; dropComingSoon?: boolean; secondImagePath?: string } = {}) {
  const startsAt = overrides.openHouseStartsAt ?? new Date(Date.now() + 2 * 86_400_000).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + 2 * 3_600_000).toISOString();
  const properties = [
    {
      id: ids.property,
      seed_key: "home-a",
      seller_id: ids.seller,
      slug: "demo-home-a",
      title: "Demo Home A",
      description: "Sample listing.",
      property_type: "single_family",
      listing_status: "for_sale",
      address_visibility: "city_zip",
      city: "Kenmore",
      state: "NY",
      postal_code: "14217",
      county: "Erie",
      bedrooms: 3,
      full_bathrooms: 1,
      square_feet: 1400,
      year_built: 1928,
      pricing_type: "asking_price",
      asking_price_cents: 21_900_000,
      published_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      id: ids.comingSoon,
      seed_key: "home-b",
      seller_id: ids.seller,
      slug: "demo-home-b",
      title: "Demo Home B",
      description: "Sample listing.",
      property_type: "single_family",
      listing_status: "coming_soon",
      address_visibility: "city_zip",
      city: "Hamburg",
      state: "NY",
      postal_code: "14075",
      pricing_type: "price_undecided",
      published_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ].filter((p) => !(overrides.dropComingSoon && p.id === ids.comingSoon));

  return {
    sellers: [
      {
        id: ids.seller,
        seed_key: "seller-a",
        account_type: "business",
        display_name: "Demo Seller A",
        username: "demo.seller.a",
        bio: "Demo profile.",
        city: "Buffalo",
        state: "NY",
      },
    ],
    properties,
    property_images: [
      { id: ids.image, seed_key: "home-a-01", property_id: ids.property, storage_path: paths.image, display_order: 0, is_cover: true, width: 2000, height: 1333, alt_text: "Front", credit: "AI-generated illustrative image" },
      { id: ids.image2, seed_key: "home-a-02", property_id: ids.property, storage_path: overrides.secondImagePath ?? paths.image2, display_order: 1, is_cover: false, width: 2000, height: 1333, alt_text: "Kitchen" },
    ],
    property_features: [],
    open_houses: [
      { id: ids.openHouse, seed_key: "oh-a", property_id: ids.property, seller_id: ids.seller, starts_at: startsAt, ends_at: endsAt, registration_type: "optional", host_type: "seller", instructions: null },
    ],
  };
}
