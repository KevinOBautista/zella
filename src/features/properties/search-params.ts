/**
 * URL <-> search state for the Explore page (/homes). Pure and framework-free
 * so the server page, client form, chips, pagination and unit tests all
 * share one definition of what a search means.
 */
import { z } from "zod";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { PROPERTY_TYPES } from "@/features/properties/wizard-schemas";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";
import type { PropertySearchFilters } from "@/features/properties/queries";

export type PropertyType = (typeof PROPERTY_TYPES)[number];
/** Every type the data model supports, in display order. */
export const PROPERTY_TYPES_FOR_SEARCH = PROPERTY_TYPES;
export const SEARCH_STATUSES = ["for_sale", "coming_soon", "sold"] as const;
export const SORTS = ["newest", "price_asc", "price_desc"] as const;
export type SortOption = (typeof SORTS)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: "Single family",
  multi_family: "Multi-family",
  condo: "Condo",
  townhouse: "Townhouse",
  co_op: "Co-op",
  land: "Land",
  manufactured_home: "Manufactured home",
  other: "Other",
};

export const STATUS_LABELS: Record<(typeof SEARCH_STATUSES)[number], string> = {
  for_sale: "For sale",
  coming_soon: "Coming soon",
  sold: "Sold",
};

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const MAX_Q = 80;
const dollars = z.coerce.number().int().min(0).max(999_999_999);
const smallInt = z.coerce.number().int().min(1).max(10);

const optional = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);

export const homesSearchSchema = z.object({
  q: optional(
    z
      .string()
      .trim()
      .min(1)
      .transform((v) => v.slice(0, MAX_Q)),
  ),
  minPrice: optional(z.string().regex(/^\d{1,9}$/).pipe(dollars)),
  maxPrice: optional(z.string().regex(/^\d{1,9}$/).pipe(dollars)),
  bedrooms: optional(smallInt),
  bathrooms: optional(smallInt),
  minSqft: optional(z.coerce.number().int().min(100).max(100_000)),
  propertyType: optional(z.enum(PROPERTY_TYPES)),
  status: optional(z.enum(SEARCH_STATUSES)),
  openHouse: optional(z.literal("1").transform(() => true as const)),
  sort: z.enum(SORTS).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type HomesSearch = z.infer<typeof homesSearchSchema>;

type RawParams = Record<string, string | string[] | undefined>;

export function parseHomesSearchParams(raw: RawParams): HomesSearch {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  const parsed = homesSearchSchema.parse(flat);
  if (parsed.minPrice != null && parsed.maxPrice != null && parsed.minPrice > parsed.maxPrice) {
    return { ...parsed, minPrice: parsed.maxPrice, maxPrice: parsed.minPrice };
  }
  return parsed;
}

export function toSearchFilters(s: HomesSearch): PropertySearchFilters {
  return {
    q: s.q,
    minPriceCents: s.minPrice != null ? s.minPrice * 100 : undefined,
    maxPriceCents: s.maxPrice != null ? s.maxPrice * 100 : undefined,
    bedrooms: s.bedrooms,
    bathrooms: s.bathrooms,
    minSqft: s.minSqft,
    propertyType: s.propertyType,
    status: s.status,
    openHouseOnly: s.openHouse === true,
    sort: s.sort,
    page: s.page,
  };
}

const FILTER_KEYS = ["q", "minPrice", "maxPrice", "bedrooms", "bathrooms", "minSqft", "propertyType", "status", "openHouse"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export type HomesSearchPatch = Partial<Omit<HomesSearch, "page">> & { page?: number | null };

/**
 * Serializes a search to an /homes href. Defaults (sort=newest, page=1) are
 * omitted, as are unknown params (e.g. the auth `resume` marker). Patching
 * any filter or sort resets the page to 1.
 */
export function buildHomesHref(s: HomesSearch, patch: HomesSearchPatch = {}): string {
  const { page: patchPage, ...rest } = patch;
  const merged: HomesSearch = { ...s, ...rest };
  const touchesQuery = Object.keys(rest).length > 0;
  const page = patchPage != null ? patchPage : touchesQuery ? 1 : s.page;

  const p = new URLSearchParams();
  if (merged.q) p.set("q", merged.q);
  if (merged.minPrice != null) p.set("minPrice", String(merged.minPrice));
  if (merged.maxPrice != null) p.set("maxPrice", String(merged.maxPrice));
  if (merged.bedrooms != null) p.set("bedrooms", String(merged.bedrooms));
  if (merged.bathrooms != null) p.set("bathrooms", String(merged.bathrooms));
  if (merged.minSqft != null) p.set("minSqft", String(merged.minSqft));
  if (merged.propertyType) p.set("propertyType", merged.propertyType);
  if (merged.status) p.set("status", merged.status);
  if (merged.openHouse) p.set("openHouse", "1");
  if (merged.sort !== "newest") p.set("sort", merged.sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/homes?${qs}` : "/homes";
}

export function hasActiveFilters(s: HomesSearch): boolean {
  return FILTER_KEYS.some((k) => s[k] !== undefined);
}

export function isFeaturedEligible(s: HomesSearch): boolean {
  return !hasActiveFilters(s) && s.page === 1 && s.sort === "newest";
}

export type FilterChip = { key: FilterKey; label: string; href: string };

export function activeFilterChips(s: HomesSearch): FilterChip[] {
  const chips: FilterChip[] = [];
  const add = (key: FilterKey, label: string) => chips.push({ key, label, href: buildHomesHref(s, { [key]: undefined }) });
  if (s.q) add("q", s.q);
  if (s.minPrice != null) add("minPrice", `Min ${formatCents(s.minPrice * 100)}`);
  if (s.maxPrice != null) add("maxPrice", `Max ${formatCents(s.maxPrice * 100)}`);
  if (s.bedrooms != null) add("bedrooms", `${s.bedrooms}+ beds`);
  if (s.bathrooms != null) add("bathrooms", `${s.bathrooms}+ baths`);
  if (s.minSqft != null) add("minSqft", `${s.minSqft.toLocaleString("en-US")}+ sqft`);
  if (s.propertyType) add("propertyType", PROPERTY_TYPE_LABELS[s.propertyType]);
  if (s.status) add("status", STATUS_LABELS[s.status]);
  if (s.openHouse) add("openHouse", "Upcoming open house");
  return chips;
}

function titleCase(input: string): string {
  return input.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function resultsHeading(s: HomesSearch): string {
  if (s.q) return `Homes in ${titleCase(s.q)}`;
  return hasActiveFilters(s) ? "Matching homes" : "Latest homes";
}

export type SearchFormValues = { minPrice: string; maxPrice: string };
export type SearchFormErrors = Partial<Record<keyof SearchFormValues, string>>;

/** Client-side inline validation for the search form's price range. */
export function validateSearchForm(values: SearchFormValues): { fieldErrors: SearchFormErrors } {
  const fieldErrors: SearchFormErrors = {};
  const min = parsePriceInput(values.minPrice);
  const max = parsePriceInput(values.maxPrice);
  if (min === "invalid") fieldErrors.minPrice = "Enter a whole-dollar amount";
  if (max === "invalid") fieldErrors.maxPrice = "Enter a whole-dollar amount";
  if (typeof min === "number" && typeof max === "number" && max < min) {
    fieldErrors.maxPrice = "Max price must be at least the min price";
  }
  return { fieldErrors };
}

/** "" -> null, "$250,000" -> 250000, junk -> "invalid". */
export function parsePriceInput(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return Math.round(parseDollarsToCents(trimmed) / 100);
  } catch {
    return "invalid";
  }
}

/**
 * Makes free text safe to interpolate into a PostgREST `.or("col.ilike.%x%")`
 * filter: strips the grammar characters (`,()` and quotes/backslash) and
 * control characters, escapes LIKE wildcards, collapses whitespace, caps length.
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[,()"'\\]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_Q);
}

/** First non-sold listing with a photo becomes the featured spot; the rest is the grid. */
export function splitFeatured<T extends PropertyCardData>(properties: T[]): { featured: T | null; rest: T[] } {
  const idx = properties.findIndex((p) => p.listing_status !== "sold" && Boolean(p.cover_image_path));
  if (idx === -1) return { featured: null, rest: properties };
  return { featured: properties[idx] ?? null, rest: [...properties.slice(0, idx), ...properties.slice(idx + 1)] };
}

export type OpenHouseRow = { property_id: string | null; starts_at: string | null; ends_at: string | null };

/** Reduces rows (already ordered by starts_at asc) to the earliest per property. */
export function pickNextOpenHouse(rows: OpenHouseRow[]): Map<string, { starts_at: string; ends_at: string }> {
  const map = new Map<string, { starts_at: string; ends_at: string }>();
  for (const r of rows) {
    if (!r.property_id || !r.starts_at || !r.ends_at) continue;
    const existing = map.get(r.property_id);
    if (!existing || r.starts_at < existing.starts_at) map.set(r.property_id, { starts_at: r.starts_at, ends_at: r.ends_at });
  }
  return map;
}
