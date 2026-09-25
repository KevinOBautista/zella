import { LEAD_STATUSES, type LeadStatus } from "@/features/leads/domain";

export const LEADS_PATH = "/dashboard/leads";

export type LeadsView = "board" | "list";
export type LeadsSort = "newest" | "oldest";

export type LeadsSearch = {
  /** "all" means every category, including closed and not interested. */
  status: LeadStatus | "all";
  property?: string;
  q?: string;
  view: LeadsView;
  sort: LeadsSort;
};

type Raw = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseLeadsSearchParams(raw: Raw): LeadsSearch {
  const status = first(raw.status);
  const view = first(raw.view);
  const sort = first(raw.sort);
  return {
    status: (LEAD_STATUSES as readonly string[]).includes(status ?? "") ? (status as LeadStatus) : "all",
    property: first(raw.property),
    q: first(raw.q),
    view: view === "list" ? "list" : "board",
    sort: sort === "oldest" ? "oldest" : "newest",
  };
}

type HrefInput = Partial<Record<"status" | "property" | "q" | "view" | "sort", string | null | undefined>>;

/**
 * Builds a /dashboard/leads URL, dropping defaults and empty values so the
 * "View all" links and filter chips stay readable and shareable.
 */
export function buildLeadsHref(search: HrefInput, override: HrefInput = {}): string {
  const merged: HrefInput = { ...search, ...override };
  const params = new URLSearchParams();
  for (const key of ["status", "property", "q", "view", "sort"] as const) {
    const value = merged[key];
    if (!value) continue;
    if (key === "status" && value === "all") continue;
    if (key === "view" && value === "board") continue;
    if (key === "sort" && value === "newest") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${LEADS_PATH}?${qs}` : LEADS_PATH;
}

/**
 * Neutralizes a buyer search term for PostgREST's `or=` filter, where
 * commas, parentheses and backslashes are syntax rather than literal
 * characters — an unescaped term would otherwise change which rows the
 * filter matches.
 */
export function escapeSearch(q: string): string {
  return q.replace(/[,()\\]/g, " ").replace(/\s+/g, " ").trim();
}
