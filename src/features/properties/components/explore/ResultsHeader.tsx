import { resultsHeading, type HomesSearch } from "@/features/properties/search-params";
import { SortSelect } from "./SortSelect";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/**
 * Result count line. Demo listings are always counted separately so sample
 * content is never presented as available inventory.
 */
export function resultsSummary(total: number, page: number, pageSize: number, demoTotal = 0): string {
  if (demoTotal > 0) {
    const real = Math.max(0, total - demoTotal);
    const parts = [real > 0 ? plural(real, "home", "homes") : null, plural(demoTotal, "demo listing", "demo listings")].filter(Boolean);
    if (total <= pageSize) return parts.join(" · ");
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);
    return `Showing ${from.toLocaleString("en-US")}–${to.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} results · ${parts.join(" · ")}`;
  }
  if (total === 0) return "No homes";
  if (total === 1) return "1 home";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  if (from > total) return `${total.toLocaleString("en-US")} homes`;
  return `Showing ${from.toLocaleString("en-US")}–${to.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} homes`;
}

export function ResultsHeader({
  search,
  total,
  page,
  pageSize,
  demoTotal = 0,
}: {
  search: HomesSearch;
  total: number;
  page: number;
  pageSize: number;
  demoTotal?: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-light tracking-tight sm:text-3xl">{resultsHeading(search)}</h2>
        <p role="status" className="mt-1 text-sm text-[var(--color-muted)]">
          {resultsSummary(total, page, pageSize, demoTotal)}
        </p>
      </div>
      <SortSelect search={search} />
    </div>
  );
}
