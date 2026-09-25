import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchTerm } from "@/features/properties/search-params";
import type { SellerCardData } from "@/features/sellers/components/SellerCard";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";
import { CARD_COLUMNS as PROPERTY_CARD_COLUMNS, type Filterable } from "@/features/properties/queries";
import { countOrThrow, orThrow } from "@/lib/supabase/read";

const CARD_COLUMNS =
  "id, username, display_name, profile_image_path, city, state, follower_count, for_sale_count, coming_soon_count, has_upcoming_open_house, is_demo";

export async function getFeaturedSellers(limit = 6): Promise<SellerCardData[]> {
  const supabase = await createClient();
  const data = orThrow(
    "sellers",
    await supabase
      .from("public_seller_profiles")
      .select(CARD_COLUMNS)
      .order("is_demo", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return (data ?? []) as SellerCardData[];
}

export type SellerSearchFilters = {
  q?: string;
  /** At least one public property currently marked For Sale (never drafts, private, sold, or Coming Soon). */
  hasHomesForSale?: boolean;
  /** At least one public, non-canceled open house that hasn't ended. */
  hasUpcomingOpenHouses?: boolean;
  page?: number;
  pageSize?: number;
};

export async function searchSellers(filters: SellerSearchFilters = {}) {
  const { q, hasHomesForSale, hasUpcomingOpenHouses, page = 1, pageSize = 24 } = filters;
  const supabase = await createClient();
  const sanitized = q ? sanitizeSearchTerm(q) : "";
  const filtered = <Q extends Filterable<Q>>(query: Q): Q => {
    let next = query;
    if (sanitized) next = next.or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`);
    // for_sale_count/has_upcoming_open_house are precomputed on the view from
    // public_properties/public_open_houses, so this never counts drafts,
    // private listings, sold, or Coming Soon properties as "for sale". For a
    // demo seller they describe its sample inventory.
    if (hasHomesForSale) next = next.gt("for_sale_count", 0);
    if (hasUpcomingOpenHouses) next = next.eq("has_upcoming_open_house", true);
    return next;
  };
  // Deterministic sort: real sellers first, then most recently
  // created — not an opaque ranking algorithm.
  let query = filtered(supabase.from("public_seller_profiles").select(CARD_COLUMNS, { count: "exact" }))
    .order("is_demo", { ascending: true })
    .order("created_at", { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);
  const demoQuery = filtered(supabase.from("public_seller_profiles").select("id", { count: "exact", head: true })).eq("is_demo", true);
  const [result, demoResult] = await Promise.all([query, demoQuery]);
  const data = orThrow("sellers", result);
  return {
    sellers: (data ?? []) as SellerCardData[],
    total: result.count ?? 0,
    demoTotal: countOrThrow("demo sellers", demoResult),
    page,
    pageSize,
  };
}

export async function getFollowedSellerIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("seller_follows").select("seller_id").eq("follower_user_id", userId);
  return new Set((data ?? []).map((r) => r.seller_id));
}

export async function getSellerByUsername(username: string) {
  const supabase = await createClient();
  const seller = orThrow("seller", await supabase.from("public_seller_profiles").select("*").ilike("username", username).maybeSingle());
  if (!seller) return null;
  const sellerId = seller.id as string;

  const listings = (status: "for_sale" | "coming_soon" | "sold") =>
    supabase
      .from("public_properties")
      .select(PROPERTY_CARD_COLUMNS)
      .eq("seller_id", sellerId)
      .eq("listing_status", status)
      .order("published_at", { ascending: false });

  const [forSale, comingSoon, sold, openHouses] = await Promise.all([
    listings("for_sale"),
    listings("coming_soon"),
    listings("sold"),
    supabase
      .from("public_open_houses")
      .select("*")
      .eq("seller_id", sellerId)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  return {
    seller,
    forSale: (orThrow("listings", forSale) ?? []) as PropertyCardData[],
    comingSoon: (orThrow("listings", comingSoon) ?? []) as PropertyCardData[],
    sold: (orThrow("listings", sold) ?? []) as PropertyCardData[],
    openHouses: orThrow("open houses", openHouses) ?? [],
  };
}
