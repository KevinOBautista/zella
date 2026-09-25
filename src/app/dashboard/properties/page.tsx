import Link from "next/link";
import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { getOwnProperties } from "@/features/properties/queries";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { filterOwnProperties, toSellerCardData, type OwnPropertyRow } from "@/features/properties/seller-card";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

export const metadata: Metadata = { title: "Properties" };

const TABS: { key: string; label: string; statuses: Enums<"property_status">[] }[] = [
  { key: "for_sale", label: "For Sale", statuses: ["for_sale"] },
  { key: "coming_soon", label: "Coming Soon", statuses: ["coming_soon"] },
  { key: "drafts", label: "Drafts", statuses: ["draft"] },
  { key: "under_contract", label: "Under Contract", statuses: ["under_contract"] },
  { key: "sold", label: "Sold", statuses: ["sold"] },
  { key: "archived", label: "Archived", statuses: ["archived", "paused"] },
];

function tabHref(key: string, q?: string) {
  const params = new URLSearchParams({ tab: key });
  if (q) params.set("q", q);
  return `/dashboard/properties?${params.toString()}`;
}

export default async function PropertiesListPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { seller } = await requireSeller();
  const { tab, q: rawQ } = await searchParams;
  const q = rawQ?.trim() || undefined;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]!;

  const properties: OwnPropertyRow[] = await getOwnProperties(seller.id);
  const searched = filterOwnProperties(properties, { q });
  const filtered = filterOwnProperties(searched, { statuses: activeTab.statuses });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Your Properties"
        description="Every listing you manage, including drafts."
        action={
          <Link href="/dashboard/properties/new" className={buttonVariants()}>
            Add Property
          </Link>
        }
      />

      <form method="get" action="/dashboard/properties" className="flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={activeTab.key} />
        <label htmlFor="property-q" className="sr-only">
          Search your properties
        </label>
        <input
          id="property-q"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title, street or city"
          className="h-10 min-w-[14rem] flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm sm:max-w-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)] hover:opacity-90"
        >
          Search
        </button>
        {q && (
          <Link href={tabHref(activeTab.key)} className="h-10 px-3 text-sm leading-10 text-[var(--color-muted)] hover:underline">
            Clear search
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count = filterOwnProperties(searched, { statuses: t.statuses }).length;
          const active = activeTab.key === t.key;
          return (
            <Link
              key={t.key}
              href={tabHref(t.key, q)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-background)]",
              )}
            >
              <span>{t.label}</span>
              <span className={active ? "opacity-80" : "text-[var(--color-muted)]"}>{count}</span>
            </Link>
          );
        })}
      </div>

      {filtered.length ? (
        // Three columns where they fit beside the sidebar, two at
        // intermediate widths, one on small screens — the Homes grid's
        // proportions and spacing.
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <PropertyCard
                variant="seller"
                property={toSellerCardData(p)}
                priority={i < 3}
                sizes="(min-width: 1280px) 28vw, (min-width: 640px) 42vw, 100vw"
              />
            </li>
          ))}
        </ul>
      ) : q ? (
        <EmptyState
          size="compact"
          title="No properties match this search."
          description={`Nothing in ${activeTab.label} matches “${q}”.`}
          actionLabel="Clear search"
          actionHref={tabHref(activeTab.key)}
        />
      ) : (
        <EmptyState
          size="compact"
          title={activeTab.key === "drafts" ? "No drafts." : `No ${activeTab.label.toLowerCase()} properties.`}
          description="Add a property and start building your seller page."
          actionLabel="Add Property"
          actionHref="/dashboard/properties/new"
        />
      )}
    </div>
  );
}
