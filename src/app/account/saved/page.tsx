import type { Metadata } from "next";
import { requireVerifiedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PropertyCard, type PropertyCardData } from "@/features/properties/components/PropertyCard";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Saved Homes" };

export default async function SavedHomesPage() {
  const user = await requireVerifiedUser();
  const supabase = await createClient();
  const { data: saves } = await supabase.from("property_saves").select("property_id").eq("user_id", user.id);
  const propertyIds = (saves ?? []).map((s) => s.property_id);

  // property_saves has a foreign key to the `properties` base table, not
  // to the `public_properties` view, so PostgREST can't embed this join —
  // fetch the redacted rows separately instead.
  const { data } = propertyIds.length
    ? await supabase
        .from("public_properties")
        .select(
          "id, slug, listing_status, asking_price_cents, expected_price_min_cents, expected_price_max_cents, pricing_type, sold_price_cents, display_line, bedrooms, full_bathrooms, square_feet, cover_image_path, has_upcoming_open_house, seller_username",
        )
        .in("id", propertyIds)
    : { data: [] };

  const properties = (data ?? []) as PropertyCardData[];

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Saved Homes</h1>
      {properties.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} isSaved isLoggedIn />
          ))}
        </div>
      ) : (
        <EmptyState title="No saved homes yet." actionLabel="Browse Homes" actionHref="/homes" />
      )}
    </div>
  );
}
