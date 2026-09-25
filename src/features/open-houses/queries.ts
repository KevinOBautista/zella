import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchTerm } from "@/features/properties/search-params";
import { CARD_COLUMNS } from "@/features/properties/queries";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";
import { mergeOpenHousesWithProperties, type OpenHouseWithProperty } from "@/features/open-houses/merge";
import { orThrow } from "@/lib/supabase/read";

export async function getUpcomingOpenHouses(limit = 12) {
  const supabase = await createClient();
  // Real events first; within each group the page keeps this order.
  const data = orThrow(
    "open houses",
    await supabase
      .from("public_open_houses")
      .select("*")
      .gt("ends_at", new Date().toISOString())
      .order("is_demo", { ascending: true })
      .order("starts_at", { ascending: true })
      .limit(limit),
  );
  return data ?? [];
}

export type { OpenHouseRow, OpenHouseWithProperty } from "@/features/open-houses/merge";

/** Upcoming open houses joined with their property's card data, for the /open-houses listing. */
export async function getUpcomingOpenHousesWithProperties(limit = 100): Promise<OpenHouseWithProperty[]> {
  const openHouses = await getUpcomingOpenHouses(limit);
  if (openHouses.length === 0) return [];
  const propertyIds = [...new Set(openHouses.map((oh) => oh.property_id).filter((id): id is string => Boolean(id)))];
  const supabase = await createClient();
  const data = orThrow("open house homes", await supabase.from("public_properties").select(CARD_COLUMNS).in("id", propertyIds));
  return mergeOpenHousesWithProperties(openHouses, (data ?? []) as PropertyCardData[]);
}

export type OpenHouseSearchFilters = {
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  bedrooms?: number;
};

export async function searchUpcomingOpenHouses(filters: OpenHouseSearchFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("public_open_houses")
    .select("*")
    .gt("ends_at", new Date().toISOString());

  const q = filters.q ? sanitizeSearchTerm(filters.q) : "";
  if (q) query = query.or(`city.ilike.%${q}%`);
  if (filters.minPriceCents != null) query = query.gte("asking_price_cents", filters.minPriceCents);
  if (filters.maxPriceCents != null) query = query.lte("asking_price_cents", filters.maxPriceCents);

  query = query.order("is_demo", { ascending: true }).order("starts_at", { ascending: true });
  return orThrow("open houses", await query) ?? [];
}

// ---- Seller-owned reads -----------------------------------------------------

export async function getOwnOpenHouses(sellerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("open_houses")
    .select("*, properties(title, slug, address_line_1, city, state)")
    .eq("seller_id", sellerId)
    .order("starts_at", { ascending: false });
  return data ?? [];
}

export async function getOwnOpenHouseById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("open_houses")
    .select("*, properties(title, slug, address_line_1, city, state, address_visibility)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: rsvps } = await supabase
    .from("open_house_rsvps")
    .select("*")
    .eq("open_house_id", id)
    .order("created_at", { ascending: false });
  return { openHouse: data, rsvps: rsvps ?? [] };
}
