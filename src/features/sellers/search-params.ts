/**
 * URL <-> search state for /sellers. Pure and framework-free, mirroring
 * src/features/properties/search-params.ts so the server page, client
 * search panel, toggles, chips and unit tests share one definition.
 */
import { z } from "zod";
import type { SellerSearchFilters } from "@/features/sellers/queries";

const MAX_Q = 80;
const optional = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);

export const sellersSearchSchema = z.object({
  q: optional(
    z
      .string()
      .trim()
      .min(1)
      .transform((v) => v.slice(0, MAX_Q)),
  ),
  hasHomes: optional(z.literal("1").transform(() => true as const)),
  hasOpenHouses: optional(z.literal("1").transform(() => true as const)),
  page: z.coerce.number().int().min(1).catch(1),
});

export type SellersSearch = z.infer<typeof sellersSearchSchema>;

type RawParams = Record<string, string | string[] | undefined>;

export function parseSellersSearchParams(raw: RawParams): SellersSearch {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  return sellersSearchSchema.parse(flat);
}

export function toSellerFilters(s: SellersSearch): SellerSearchFilters {
  return {
    q: s.q,
    hasHomesForSale: s.hasHomes === true,
    hasUpcomingOpenHouses: s.hasOpenHouses === true,
    page: s.page,
  };
}

const FILTER_KEYS = ["q", "hasHomes", "hasOpenHouses"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export type SellersSearchPatch = Partial<Omit<SellersSearch, "page">> & { page?: number | null };

/** Serializes a search to a /sellers href. Defaults are omitted, as are unknown params. Patching any filter resets the page to 1. */
export function buildSellersHref(s: SellersSearch, patch: SellersSearchPatch = {}): string {
  const { page: patchPage, ...rest } = patch;
  const merged: SellersSearch = { ...s, ...rest };
  const touchesQuery = Object.keys(rest).length > 0;
  const page = patchPage != null ? patchPage : touchesQuery ? 1 : s.page;

  const p = new URLSearchParams();
  if (merged.q) p.set("q", merged.q);
  if (merged.hasHomes) p.set("hasHomes", "1");
  if (merged.hasOpenHouses) p.set("hasOpenHouses", "1");
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/sellers?${qs}` : "/sellers";
}

export function hasActiveSellerFilters(s: SellersSearch): boolean {
  return FILTER_KEYS.some((k) => s[k] !== undefined);
}

export type SellerFilterChip = { key: FilterKey; label: string; href: string };

export function sellerFilterChips(s: SellersSearch): SellerFilterChip[] {
  const chips: SellerFilterChip[] = [];
  const add = (key: FilterKey, label: string) => chips.push({ key, label, href: buildSellersHref(s, { [key]: undefined }) });
  if (s.q) add("q", s.q);
  if (s.hasHomes) add("hasHomes", "Has homes for sale");
  if (s.hasOpenHouses) add("hasOpenHouses", "Has upcoming open houses");
  return chips;
}
