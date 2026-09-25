import { TZDate } from "@date-fns/tz";
import { stableId } from "../lib/ids";
import { buildOpenHouseTimes, parseReferenceDate, DEMO_TIME_ZONE, type OpenHouseTemplate } from "./dates";
import type { DemoDataset, ManifestImage, PhotoManifest } from "./schema";
import { DEMO_DATASET_ID } from "../../supabase/demo/wny-demo-2026/dataset";

/** The exact JSON accepted by the admin_apply_demo_dataset RPC. */
export type DemoPayload = ReturnType<typeof buildDemoPayload>;

export function demoId(table: string, key: string): string {
  return stableId(undefined, DEMO_DATASET_ID, table, key);
}

/** Content-addressed, so a changed photo never overwrites a live object. */
export function demoStoragePath(img: Pick<ManifestImage, "propertyKey" | "sha256" | "order" | "room">): string {
  return `demo/${DEMO_DATASET_ID}/${img.propertyKey}/${img.sha256.slice(0, 12)}-${String(img.order).padStart(2, "0")}-${img.room}.webp`;
}

function publishedAt(referenceDate: string, daysAgo: number): string {
  const ref = parseReferenceDate(referenceDate);
  return new Date(new TZDate(ref.year, ref.month - 1, ref.day - daysAgo, 10, 0, 0, 0, DEMO_TIME_ZONE).getTime()).toISOString();
}

export function buildDemoPayload(dataset: DemoDataset, manifest: PhotoManifest, referenceDate: string) {
  const sellerIds = new Map(dataset.sellers.map((s) => [s.key, demoId("seller", s.key)]));
  const propertyIds = new Map(dataset.properties.map((p) => [p.key, demoId("property", p.key)]));

  const sellers = dataset.sellers.map((s) => ({
    id: sellerIds.get(s.key)!,
    seed_key: s.key,
    account_type: s.accountType,
    display_name: s.displayName,
    username: s.username,
    bio: s.bio,
    city: s.city,
    state: s.state,
  }));

  const properties = dataset.properties.map((p) => ({
    id: propertyIds.get(p.key)!,
    seed_key: p.key,
    seller_id: sellerIds.get(p.sellerKey)!,
    slug: p.slug,
    title: p.title,
    description: p.description,
    property_type: p.propertyType,
    listing_status: p.listingStatus,
    address_visibility: "city_zip" as const,
    city: p.city,
    state: "NY",
    postal_code: p.postalCode,
    county: p.county,
    bedrooms: p.bedrooms,
    full_bathrooms: p.fullBathrooms,
    half_bathrooms: p.halfBathrooms,
    square_feet: p.squareFeet,
    lot_size: p.lotSize ?? null,
    lot_size_unit: p.lotSizeUnit ?? null,
    year_built: p.yearBuilt,
    stories: p.stories,
    parking_spaces: p.parkingSpaces,
    garage_spaces: p.garageSpaces,
    number_of_units: null,
    basement_type: p.basementType ?? null,
    heating_type: p.heatingType ?? null,
    cooling_type: p.coolingType ?? null,
    parking_type: p.parkingType ?? null,
    hoa_fee_cents: p.hoaFeeCents ?? null,
    property_taxes_annual_cents: p.propertyTaxesAnnualCents,
    pricing_type: p.pricing.type,
    asking_price_cents: p.pricing.type === "asking_price" ? p.pricing.askingPriceCents : null,
    expected_price_min_cents: p.pricing.type === "expected_range" ? p.pricing.minCents : null,
    expected_price_max_cents: p.pricing.type === "expected_range" ? p.pricing.maxCents : null,
    published_at: publishedAt(referenceDate, p.publishedDaysAgo),
  }));

  const property_features = dataset.properties.flatMap((p) =>
    p.features.map((slug) => ({ property_id: propertyIds.get(p.key)!, feature_slug: slug })),
  );

  const property_images = manifest.images
    .filter((img) => propertyIds.has(img.propertyKey))
    .map((img) => ({
      id: demoId("property_image", `${img.propertyKey}:${img.order}`),
      seed_key: `${img.propertyKey}-${String(img.order).padStart(2, "0")}`,
      property_id: propertyIds.get(img.propertyKey)!,
      storage_path: demoStoragePath(img),
      display_order: img.order,
      is_cover: img.isCover,
      width: img.width,
      height: img.height,
      alt_text: img.alt,
      credit: img.attributionText,
    }));

  const open_houses = dataset.openHouses.map((o) => {
    const property = dataset.properties.find((p) => p.key === o.propertyKey)!;
    const { startsAt, endsAt } = buildOpenHouseTimes(referenceDate, o.template as OpenHouseTemplate);
    return {
      id: demoId("open_house", o.key),
      seed_key: o.key,
      property_id: propertyIds.get(o.propertyKey)!,
      seller_id: sellerIds.get(property.sellerKey)!,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      registration_type: o.registrationType,
      host_type: "seller" as const,
      instructions: o.instructions,
    };
  });

  return { sellers, properties, property_features, property_images, open_houses };
}

/** Rows for admin_refresh_demo_open_house_dates. */
export function buildDateRefreshRows(dataset: DemoDataset, referenceDate: string) {
  return dataset.openHouses.map((o) => {
    const { startsAt, endsAt } = buildOpenHouseTimes(referenceDate, o.template as OpenHouseTemplate);
    return { seed_key: o.key, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() };
  });
}
