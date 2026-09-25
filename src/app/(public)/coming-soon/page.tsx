import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getComingSoonProperties, getSavedPropertyIds } from "@/features/properties/queries";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Coming Soon" };

export default async function ComingSoonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [properties, savedIds] = await Promise.all([
    getComingSoonProperties(48),
    user ? getSavedPropertyIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display mb-2 text-3xl">Coming Soon</h1>
      <p className="mb-8 max-w-2xl text-[var(--color-muted)]">
        Discover properties local sellers are considering selling or preparing to bring to market.
      </p>
      {properties.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} isSaved={savedIds.has(p.id)} isLoggedIn={Boolean(user)} />
          ))}
        </div>
      ) : (
        <EmptyState title="No Coming Soon properties yet" description="Check back soon." />
      )}
    </main>
  );
}
