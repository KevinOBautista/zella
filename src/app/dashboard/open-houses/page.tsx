import Link from "next/link";
import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { getOwnOpenHouses } from "@/features/open-houses/queries";
import { deriveOpenHouseState } from "@/features/open-houses/domain";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";

export const metadata: Metadata = { title: "Open Houses" };

const TABS = ["upcoming", "past", "cancelled"] as const;

export default async function OpenHousesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { seller } = await requireSeller();
  const { tab } = await searchParams;
  const activeTab = TABS.includes(tab as (typeof TABS)[number]) ? (tab as (typeof TABS)[number]) : "upcoming";

  const openHouses = await getOwnOpenHouses(seller.id);
  const now = new Date();
  const withState = openHouses.map((oh) => ({ ...oh, derivedState: deriveOpenHouseState({ status: oh.status, endsAt: new Date(oh.ends_at) }, now) }));
  const filtered = withState.filter((oh) => oh.derivedState === activeTab);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Open Houses"
        description="Scheduled showings across your properties. Times are Eastern."
        action={
          <Link href="/dashboard/open-houses/new" className={buttonVariants()}>
            Schedule Open House
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count = withState.filter((oh) => oh.derivedState === t).length;
          const active = activeTab === t;
          return (
            <Link
              key={t}
              href={`/dashboard/open-houses?tab=${t}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-background)]",
              )}
            >
              <span>{t}</span>
              <span className={active ? "opacity-80" : "text-[var(--color-muted)]"}>{count}</span>
            </Link>
          );
        })}
      </div>

      {filtered.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((oh) => (
            <li
              key={oh.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--color-border)] bg-white/95 p-5 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{oh.properties?.title ?? oh.properties?.address_line_1}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {formatOpenHouseDateTime(oh.starts_at, oh.ends_at)} ET
                </p>
                {oh.status === "cancelled" && (
                  <Badge variant="danger" className="mt-2">
                    Cancelled
                  </Badge>
                )}
              </div>
              <Link href={`/dashboard/open-houses/${oh.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Manage
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          size="compact"
          title={`No ${activeTab} open houses.`}
          actionLabel="Schedule Open House"
          actionHref="/dashboard/open-houses/new"
        />
      )}
    </div>
  );
}
