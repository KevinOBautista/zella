import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";
import { pickNextOpenHouse, sanitizeSearchTerm } from "@/features/properties/search-params";
import { countOrThrow, orThrow } from "@/lib/supabase/read";

export const CARD_COLUMNS =
  "id, slug, listing_status, asking_price_cents, expected_price_min_cents, expected_price_max_cents, pricing_type, sold_price_cents, display_line, bedrooms, full_bathrooms, half_bathrooms, square_feet, cover_image_path, has_upcoming_open_house, seller_id, seller_username, seller_display_name, seller_profile_image_path, address_visibility, property_type, city, is_demo";

export async function getSavedPropertyIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("property_saves").select("property_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.property_id));
}

// Real listings always come before demo listings wherever both appear.
export async function getNewlyListedProperties(limit = 8): Promise<PropertyCardData[]> {
  const supabase = await createClient();
  const data = orThrow(
    "newly listed homes",
    await supabase
      .from("public_properties")
      .select(CARD_COLUMNS)
      .eq("listing_status", "for_sale")
      .order("is_demo", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(limit),
  );
  return (data ?? []) as PropertyCardData[];
}

export async function getComingSoonProperties(limit = 8): Promise<PropertyCardData[]> {
  const supabase = await createClient();
  const data = orThrow(
    "coming soon homes",
    await supabase
      .from("public_properties")
      .select(CARD_COLUMNS)
      .eq("listing_status", "coming_soon")
      .order("is_demo", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(limit),
  );
  return (data ?? []) as PropertyCardData[];
}

export type PropertySearchFilters = {
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSqft?: number;
  propertyType?: Tables<"public_properties">["property_type"];
  status?: "for_sale" | "coming_soon" | "under_contract" | "sold";
  openHouseOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
};

/** The filter methods shared by every public query builder (structural, so one helper serves count and page queries). */
export type Filterable<Q> = {
  in(column: string, values: readonly string[]): Q;
  or(filters: string): Q;
  gte(column: string, value: number): Q;
  lte(column: string, value: number): Q;
  gt(column: string, value: number): Q;
  eq(column: string, value: string | boolean): Q;
};

export async function searchProperties(filters: PropertySearchFilters) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 24;
  const page = filters.page ?? 1;

  // The same filters feed the page query and the demo count, so the summary
  // can report real and demo results separately.
  const filtered = <Q extends Filterable<Q>>(query: Q): Q => {
    let q = query.in("listing_status", filters.status ? [filters.status] : ["for_sale", "coming_soon", "sold"]);
    // Search only ever matches visible fields (city, display_line) — a
    // hidden street address can never be matched or revealed this way.
    const term = filters.q ? sanitizeSearchTerm(filters.q) : "";
    if (term) q = q.or(`city.ilike.%${term}%,display_line.ilike.%${term}%`);
    if (filters.minPriceCents != null) q = q.gte("asking_price_cents", filters.minPriceCents);
    if (filters.maxPriceCents != null) q = q.lte("asking_price_cents", filters.maxPriceCents);
    if (filters.bedrooms != null) q = q.gte("bedrooms", filters.bedrooms);
    if (filters.bathrooms != null) q = q.gte("full_bathrooms", filters.bathrooms);
    if (filters.minSqft != null) q = q.gte("square_feet", filters.minSqft);
    if (filters.propertyType) q = q.eq("property_type", filters.propertyType);
    if (filters.openHouseOnly) q = q.eq("has_upcoming_open_house", true);
    return q;
  };

  let query = filtered(supabase.from("public_properties").select(CARD_COLUMNS, { count: "exact" }));
  query = query.order("is_demo", { ascending: true });
  if (filters.sort === "price_asc") query = query.order("asking_price_cents", { ascending: true, nullsFirst: false });
  else if (filters.sort === "price_desc") query = query.order("asking_price_cents", { ascending: false, nullsFirst: false });
  else query = query.order("published_at", { ascending: false });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const demoQuery = filtered(supabase.from("public_properties").select("id", { count: "exact", head: true })).eq("is_demo", true);
  const [result, demoResult] = await Promise.all([query, demoQuery]);
  const data = orThrow("homes", result);
  const demoTotal = countOrThrow("demo homes", demoResult);
  return { properties: (data ?? []) as PropertyCardData[], total: result.count ?? 0, demoTotal, page, pageSize };
}

/**
 * Populates `nextOpenHouse` for cards flagged `has_upcoming_open_house` with
 * one batched read of public_open_houses (which only ever exposes scheduled
 * events on full-address listings, so nothing hidden can surface here).
 */
export async function attachNextOpenHouses<T extends PropertyCardData>(properties: T[]): Promise<T[]> {
  const ids = properties.filter((p) => p.has_upcoming_open_house).map((p) => p.id);
  if (ids.length === 0) return properties;
  const supabase = await createClient();
  const data = orThrow(
    "open houses",
    await supabase
      .from("public_open_houses")
      .select("property_id, starts_at, ends_at")
      .in("property_id", ids)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
  );
  const next = pickNextOpenHouse(data ?? []);
  return properties.map((p) => ({ ...p, nextOpenHouse: next.get(p.id) ?? null }));
}

export async function getPropertyBySlug(slug: string) {
  const supabase = await createClient();
  const property = orThrow("home", await supabase.from("public_properties").select("*").eq("slug", slug).maybeSingle());
  if (!property) return null;
  // Postgres views don't preserve NOT NULL, so every column of
  // public_properties is typed nullable even though `id` (the underlying
  // primary key) is never actually null for a row that exists.
  const propertyId = property.id as string;

  const [imagesRes, featuresRes, customFeaturesRes, agentRes, openHousesRes] =
    await Promise.all([
      supabase
        .from("public_property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("is_cover", { ascending: false })
        .order("display_order", { ascending: true }),
      supabase.from("public_property_features").select("*").eq("property_id", propertyId),
      supabase.from("public_property_custom_features").select("*").eq("property_id", propertyId),
      supabase.from("public_property_agents").select("*").eq("property_id", propertyId).maybeSingle(),
      supabase
        .from("public_open_houses")
        .select("*")
        .eq("property_id", propertyId)
        .gt("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true }),
    ]);

  const images = orThrow("photos", imagesRes);
  const features = orThrow("features", featuresRes);
  const customFeatures = orThrow("features", customFeaturesRes);
  const agent = orThrow("agent", agentRes);
  const openHouses = orThrow("open houses", openHousesRes);

  return {
    property,
    images: images ?? [],
    features: features ?? [],
    customFeatures: customFeatures ?? [],
    agent: agent ?? null,
    openHouses: openHouses ?? [],
  };
}

// ---- Seller-owned reads (RLS-scoped to the caller) -------------------------

export async function getOwnProperties(sellerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(storage_path, is_cover, display_order)")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getOwnPropertyById(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
  return data;
}

export async function countActiveListings(sellerId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .in("listing_status", ["coming_soon", "for_sale", "under_contract"]);
  return count ?? 0;
}
