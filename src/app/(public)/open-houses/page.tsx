import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/viewer";
import { getSavedPropertyIds } from "@/features/properties/queries";
import { getUpcomingOpenHousesWithProperties } from "@/features/open-houses/queries";
import { groupOpenHousesByDate } from "@/lib/dates";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { ExplorePageHeader } from "@/components/shared/ExplorePageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { limits } from "@/config/limits";
import { DEMO_COPY } from "@/features/demo/constants";

export const metadata: Metadata = { title: "Open Houses" };

export default async function OpenHousesPage() {
  const viewer = await getViewer();
  const isLoggedIn = Boolean(viewer.user);

  const [items, savedIds] = await Promise.all([
    getUpcomingOpenHousesWithProperties(100),
    viewer.user ? getSavedPropertyIds(viewer.user.id) : Promise.resolve(new Set<string>()),
  ]);

  // Grouping/ordering: groupOpenHousesByDate (src/lib/dates.ts)
  // buckets by the property's launch time zone and already omits empty
  // buckets; getUpcomingOpenHousesWithProperties only ever returns scheduled,
  // not-yet-ended events on full-address listings, ordered by
  // starts_at, so canceled/ended events are excluded and in-progress ones
  // stay visible until they end.
  const demoCount = items.filter((item) => item.property.is_demo).length;
  const realCount = items.length - demoCount;
  const groups = groupOpenHousesByDate(
    items.map((item) => ({ ...item, startsAt: new Date(item.openHouse.starts_at!) })),
    new Date(),
    limits.openHouse.defaultTimezone,
  );

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <ExplorePageHeader title="Open Houses" subtitle="Explore upcoming open houses across Western New York." />

        {groups.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="No open houses are scheduled yet."
            description="Check back soon or browse homes for sale."
            actionLabel="Browse homes"
            actionHref="/homes"
          />
        ) : (
          <>
          {demoCount > 0 && (
            <p role="status" className="mt-8 text-sm text-[var(--color-muted)]">
              {[realCount > 0 ? `${realCount} open ${realCount === 1 ? "house" : "houses"}` : null, `${demoCount} demo ${demoCount === 1 ? "event" : "events"}`]
                .filter(Boolean)
                .join(" · ")}
              {". "}
              {DEMO_COPY.eventNotice}
            </p>
          )}
          <div className={demoCount > 0 ? "mt-8 space-y-12" : "mt-12 space-y-12"}>
            {groups.map((group) => (
              <section key={group.label} aria-labelledby={`open-house-group-${group.label}`}>
                <h2 id={`open-house-group-${group.label}`} className="text-2xl font-light tracking-tight sm:text-3xl">
                  {group.label}
                </h2>
                <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {group.events.map((item) => (
                    <li key={item.openHouse.id}>
                      <PropertyCard
                        property={item.property}
                        isSaved={savedIds.has(item.property.id)}
                        isLoggedIn={isLoggedIn}
                        openHouseEvent={{
                          id: item.openHouse.id!,
                          startsAt: item.openHouse.starts_at!,
                          endsAt: item.openHouse.ends_at!,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          </>
        )}
      </div>
    </main>
  );
}
