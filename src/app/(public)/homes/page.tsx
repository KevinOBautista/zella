import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/viewer";
import { attachNextOpenHouses, getSavedPropertyIds, searchProperties } from "@/features/properties/queries";
import {
  buildHomesHref,
  hasActiveFilters,
  isFeaturedEligible,
  parseHomesSearchParams,
  resultsHeading,
  splitFeatured,
  toSearchFilters,
} from "@/features/properties/search-params";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { ExploreSearchPanel } from "@/features/properties/components/explore/ExploreSearchPanel";
import { QuickToggles } from "@/features/properties/components/explore/QuickToggles";
import { FeaturedListing } from "@/features/properties/components/explore/FeaturedListing";
import { ResultsHeader } from "@/features/properties/components/explore/ResultsHeader";
import { ActiveFilterChips } from "@/features/properties/components/explore/ActiveFilterChips";
import { ExplorePagination } from "@/features/properties/components/explore/ExplorePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExplorePageHeader } from "@/components/shared/ExplorePageHeader";

type RawSearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const search = parseHomesSearchParams(await searchParams);
  const filtered = hasActiveFilters(search) || search.page > 1;
  return {
    title: search.q ? resultsHeading(search) : "Explore Homes",
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function HomesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const search = parseHomesSearchParams(await searchParams);
  const viewer = await getViewer();
  const isLoggedIn = Boolean(viewer.user);

  const [result, savedIds] = await Promise.all([
    searchProperties(toSearchFilters(search)),
    viewer.user ? getSavedPropertyIds(viewer.user.id) : Promise.resolve(new Set<string>()),
  ]);

  const properties = await attachNextOpenHouses(result.properties);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pastEnd = result.total > 0 && search.page > totalPages;
  const { featured, rest } = isFeaturedEligible(search) ? splitFeatured(properties) : { featured: null, rest: properties };
  const filtersActive = hasActiveFilters(search);

  // Remount the search panel whenever the applied query changes so its
  // typed values re-seed from the URL (chips, Back button, shared links).
  const panelKey = buildHomesHref(search, { page: null });

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
      <ExplorePageHeader title="Explore homes." subtitle="Discover homes, upcoming listings, and open houses across Western New York." />

      <div className="mt-8">
        <ExploreSearchPanel key={panelKey} initial={search} />
        <div className="mt-3">
          <QuickToggles search={search} />
        </div>
      </div>

      {featured && (
        <div className="mt-12">
          <FeaturedListing property={featured} isSaved={savedIds.has(featured.id)} isLoggedIn={isLoggedIn} />
        </div>
      )}

      </div>

      {/* Full-bleed white results section; inner containers keep the page gutters. */}
      <section aria-labelledby="results-heading" className="mt-12 bg-white pb-16 sm:pb-20">
        <div id="results-heading" className="results-heading py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <ResultsHeader search={search} total={result.total} page={search.page} pageSize={result.pageSize} demoTotal={result.demoTotal} />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {filtersActive && (
          <div className="mt-4">
            <ActiveFilterChips search={search} />
          </div>
        )}

        {rest.length > 0 ? (
          <>
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <li key={p.id}>
                  <PropertyCard property={p} isSaved={savedIds.has(p.id)} isLoggedIn={isLoggedIn} priority={!featured && i < 3} />
                </li>
              ))}
            </ul>
            <div className="mt-12">
              <ExplorePagination search={search} page={search.page} totalPages={totalPages} />
            </div>
          </>
        ) : pastEnd ? (
          <EmptyState
            className="mt-8 bg-white"
            title="This page is past the end of the results."
            description={`There ${totalPages === 1 ? "is only 1 page" : `are only ${totalPages} pages`} of matching homes.`}
            actionLabel="Go to the first page"
            actionHref={buildHomesHref(search, { page: 1 })}
          />
        ) : filtersActive || featured ? (
          <EmptyState
            className="mt-8 bg-white"
            title="No homes match these filters."
            description="Try widening your price range or removing a filter."
            actionLabel="Adjust filters"
            actionHref="#explore-search"
            secondaryActionLabel="Clear all"
            secondaryActionHref={buildHomesHref({ sort: search.sort, page: 1 })}
          />
        ) : (
          <EmptyState
            className="mt-8 bg-white"
            title="No homes are listed yet."
            description="Sellers across Western New York are getting set up. Check back soon or browse upcoming open houses."
            actionLabel="Browse open houses"
            actionHref="/open-houses"
          />
        )}
        </div>
      </section>
    </main>
  );
}
