import { toPublicAddress, type AddressVisibility } from "@/features/properties/domain";
import type { Enums } from "@/types/database";
import type { SellerPropertyCardData } from "@/features/properties/components/PropertyCard";

export type OwnPropertyImage = { storage_path: string; is_cover: boolean | null; display_order: number | null };

/** The subset of a `properties` row the seller grid card needs. */
export type OwnPropertyRow = {
  id: string;
  slug: string | null;
  title: string | null;
  listing_status: Enums<"property_status">;
  address_visibility: AddressVisibility;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  asking_price_cents: number | null;
  expected_price_min_cents: number | null;
  expected_price_max_cents: number | null;
  pricing_type: Enums<"pricing_type"> | null;
  sold_price_cents: number | null;
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  square_feet: number | null;
  property_type: Enums<"property_type"> | null;
  property_images?: OwnPropertyImage[] | null;
};

function pickCover(images: OwnPropertyImage[] | null | undefined): string | null {
  if (!images?.length) return null;
  const cover = images.find((i) => i.is_cover);
  if (cover) return cover.storage_path;
  const ordered = [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  return ordered[0]?.storage_path ?? null;
}

/**
 * Maps a seller's own property row onto the shared listing-card DTO.
 *
 * The location line is redacted through `toPublicAddress` exactly like the
 * public card, so a Coming Soon listing reads the same in the seller grid
 * as it does on /homes. The seller's full address lives on the property
 * management page, not on a card.
 */
export function toSellerCardData(row: OwnPropertyRow): SellerPropertyCardData {
  const hasAddress = Boolean(row.address_line_1 && row.city && row.state);
  const display_line = hasAddress
    ? toPublicAddress({
        addressVisibility: row.address_visibility,
        addressLine1: row.address_line_1!,
        addressLine2: null,
        city: row.city!,
        state: row.state!,
        postalCode: row.postal_code ?? "",
        latitude: null,
        longitude: null,
      }).displayLine.trim()
    : "No address yet";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    listing_status: row.listing_status,
    asking_price_cents: row.asking_price_cents,
    expected_price_min_cents: row.expected_price_min_cents,
    expected_price_max_cents: row.expected_price_max_cents,
    pricing_type: row.pricing_type,
    sold_price_cents: row.sold_price_cents,
    display_line,
    bedrooms: row.bedrooms,
    full_bathrooms: row.full_bathrooms,
    half_bathrooms: row.half_bathrooms,
    square_feet: row.square_feet,
    cover_image_path: pickCover(row.property_images),
    has_upcoming_open_house: null,
    seller_username: null,
    address_visibility: row.address_visibility,
    property_type: row.property_type,
    city: row.city,
    canScheduleOpenHouse:
      row.address_visibility === "full" && row.listing_status !== "draft" && row.listing_status !== "archived",
  };
}

/** In-memory status/search filtering for the seller's own inventory. */
export function filterOwnProperties<T extends Pick<OwnPropertyRow, "listing_status" | "title" | "address_line_1" | "city">>(
  rows: readonly T[],
  filters: { statuses?: readonly Enums<"property_status">[]; q?: string },
): T[] {
  const needle = filters.q?.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.statuses && !filters.statuses.includes(row.listing_status)) return false;
    if (!needle) return true;
    return [row.title, row.address_line_1, row.city].some((v) => v?.toLowerCase().includes(needle));
  });
}
