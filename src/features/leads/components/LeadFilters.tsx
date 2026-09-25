import Link from "next/link";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/features/leads/domain";
import { buildLeadsHref, LEADS_PATH, type LeadsSearch } from "@/features/leads/search-params";
import { cn } from "@/lib/utils";

type Props = {
  search: Pick<LeadsSearch, "status" | "view" | "sort"> & { property?: string; q?: string };
  /** Counts for the applied property/search filters, across every status. */
  counts: Record<LeadStatus, number>;
  total: number;
  properties: { id: string; title: string | null; address_line_1: string | null }[];
};

const controlClass =
  "h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";

export function LeadFilters({ search, counts, total, properties }: Props) {
  const filtersActive = search.status !== "all" || Boolean(search.property) || Boolean(search.q) || search.sort !== "newest";

  return (
    <div className="space-y-4">
      <form method="get" action={LEADS_PATH} className="flex flex-wrap items-end gap-3">
        {search.view === "list" && <input type="hidden" name="view" value="list" />}
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="lead-q" className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Search name, email or phone
          </label>
          <input id="lead-q" name="q" defaultValue={search.q ?? ""} placeholder="Search buyers" className={cn(controlClass, "w-full")} />
        </div>
        <div>
          <label htmlFor="lead-property" className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Property
          </label>
          <select id="lead-property" name="property" defaultValue={search.property ?? ""} className={controlClass}>
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.address_line_1 || "Untitled draft"}
              </option>
            ))}
          </select>
        </div>
        {/* Status as a select on small screens; the tab row below covers
            desktop. Both carry the same counts. */}
        <div className="md:hidden">
          <label htmlFor="lead-status" className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Status
          </label>
          <select id="lead-status" name="status" defaultValue={search.status} className={controlClass}>
            <option value="all">All ({total})</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]} ({counts[s]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lead-sort" className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Sort
          </label>
          <select id="lead-sort" name="sort" defaultValue={search.sort} className={controlClass}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)] hover:opacity-90"
        >
          Apply
        </button>
        {filtersActive && (
          <Link href={LEADS_PATH} className="h-10 rounded-[var(--radius-md)] px-3 text-sm leading-10 text-[var(--color-muted)] hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden flex-wrap gap-1.5 md:flex">
          <StatusTab href={buildLeadsHref(search, { status: null })} label="All" count={total} active={search.status === "all"} />
          {LEAD_STATUSES.map((s) => (
            <StatusTab
              key={s}
              href={buildLeadsHref(search, { status: s })}
              label={LEAD_STATUS_LABELS[s]}
              count={counts[s]}
              active={search.status === s}
            />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <ViewTab href={buildLeadsHref(search, { view: null })} label="Board" active={search.view === "board"} />
          <ViewTab href={buildLeadsHref(search, { view: "list" })} label="List" active={search.view === "list"} />
        </div>
      </div>
    </div>
  );
}

function StatusTab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-background)]",
      )}
    >
      <span>{label}</span>
      <span className={active ? "opacity-80" : "text-[var(--color-muted)]"}>{count}</span>
    </Link>
  );
}

function ViewTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-[var(--color-foreground)] bg-[var(--color-surface)] font-medium"
          : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface)]",
      )}
    >
      {label}
    </Link>
  );
}
