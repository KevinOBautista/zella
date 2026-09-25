import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { searchSellers, getFollowedSellerIds } from "@/features/sellers/queries";
import { SellerCard } from "@/features/sellers/components/SellerCard";
import { SellersSearchPanel } from "@/features/sellers/components/SellersSearchPanel";
import { SellerQuickToggles } from "@/features/sellers/components/SellerQuickToggles";
import { SellerActiveFilterChips } from "@/features/sellers/components/SellerActiveFilterChips";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExplorePageHeader } from "@/components/shared/ExplorePageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { buildSellersHref, hasActiveSellerFilters, parseSellersSearchParams, toSellerFilters } from "@/features/sellers/search-params";

export const metadata: Metadata = { title: "Discover Sellers" };

type RawSearchParams = Record<string, string | string[] | undefined>;

function sellerSummary(total: number, demoTotal: number): string {
  const real = Math.max(0, total - demoTotal);
  const parts = [real > 0 ? `${real} ${real === 1 ? "seller" : "sellers"}` : null, `${demoTotal} demo ${demoTotal === 1 ? "seller" : "sellers"}`];
  return parts.filter(Boolean).join(" · ");
}

export default async function SellersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const search = parseSellersSearchParams(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ sellers, total, demoTotal, pageSize }, followedIds] = await Promise.all([
    searchSellers(toSellerFilters(search)),
    user ? getFollowedSellerIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pastEnd = total > 0 && search.page > totalPages;
  const filtersActive = hasActiveSellerFilters(search);

  // Remount the search panel whenever the applied query changes so its typed
  // value re-seeds from the URL (chips, Back button, shared links).
  const panelKey = buildSellersHref(search, { page: null });

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <ExplorePageHeader title="Discover Sellers" subtitle="Find local sellers and explore their properties." />

        <div className="mt-8">
          <SellersSearchPanel key={panelKey} initial={search} />
          <div className="mt-3">
            <SellerQuickToggles search={search} />
          </div>
        </div>

        {filtersActive && (
          <div className="mt-4">
            <SellerActiveFilterChips search={search} />
          </div>
        )}

        {sellers.length > 0 ? (
          <>
            {demoTotal > 0 && (
              <p role="status" className="mt-8 text-sm text-[var(--color-muted)]">
                {sellerSummary(total, demoTotal)}
              </p>
            )}
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.map((s) => (
                <li key={s.id}>
                  <SellerCard seller={s} isFollowing={followedIds.has(s.id)} isLoggedIn={Boolean(user)} />
                </li>
              ))}
            </ul>
            <div className="mt-12">
              <Pagination page={search.page} totalPages={totalPages} hrefFor={(p) => buildSellersHref(search, { page: p })} />
            </div>
          </>
        ) : pastEnd ? (
          <EmptyState
            className="mt-8"
            title="This page is past the end of the results."
            description={`There ${totalPages === 1 ? "is only 1 page" : `are only ${totalPages} pages`} of matching sellers.`}
            actionLabel="Go to the first page"
            actionHref={buildSellersHref(search, { page: 1 })}
          />
        ) : filtersActive ? (
          <EmptyState
            className="mt-8"
            title="No sellers match these filters."
            description="Try a different search or clearing a filter."
            actionLabel="Clear all"
            actionHref={buildSellersHref({ page: 1 })}
          />
        ) : (
          <EmptyState className="mt-8" title="No sellers yet." description="Local sellers are getting set up. Check back soon." />
        )}
      </div>
    </main>
  );
}
