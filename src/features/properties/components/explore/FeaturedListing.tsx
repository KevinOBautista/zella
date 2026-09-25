import Link from "next/link";
import { avatarUrl, propertyImageUrl } from "@/lib/storage/publicUrl";
import { formatOpenHouseShort } from "@/features/open-houses/format";
import { SaveButton } from "@/features/saves/components/SaveButton";
import { ContactSellerDialog } from "@/features/leads/components/ContactSellerDialog";
import { CardImage } from "@/features/properties/components/CardImage";
import { ListingStatusBadge } from "@/features/properties/components/ListingStatusBadge";
import { DemoBadge } from "@/features/demo/components/DemoBadge";
import { DEMO_COPY } from "@/features/demo/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bathsLabel, hidesAddress, priceLabel, type PropertyCardData } from "@/features/properties/components/PropertyCard";

/** Two letters from the display name, falling back to the username. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  const letters = parts.length === 1 || !last ? first.slice(0, 2) : first.slice(0, 1) + last.slice(0, 1);
  return letters.toUpperCase();
}

/**
 * Editorial photo-and-details treatment for the most recently listed home
 * on the unfiltered first page. Heading is transparent about the selection
 * rule ("Recently listed") — there is no featured or sponsored flag.
 */
export function FeaturedListing({ property, isSaved, isLoggedIn }: { property: PropertyCardData; isSaved: boolean; isLoggedIn: boolean }) {
  const href = `/homes/${property.slug}`;
  const isDemo = Boolean(property.is_demo);
  const price = priceLabel(property);
  const baths = bathsLabel(property.full_bathrooms, property.half_bathrooms);
  const stats = [
    property.bedrooms != null ? { label: "Beds", value: String(property.bedrooms) } : null,
    baths ? { label: "Baths", value: baths.replace(" ba", "") } : null,
    property.square_feet != null ? { label: "Sq ft", value: property.square_feet.toLocaleString("en-US") } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  const sellerName = property.seller_display_name ?? (property.seller_username ? `@${property.seller_username}` : null);
  const sellerPhoto = avatarUrl(property.seller_profile_image_path ?? null);

  return (
    <section aria-labelledby="featured-listing-heading" className="grid gap-4 lg:grid-cols-12 lg:gap-6">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[var(--color-border)] lg:col-span-7">
        <Link href={href} aria-label={`View listing: ${price}, ${property.display_line ?? ""}`} className="absolute inset-0 block">
          <CardImage src={propertyImageUrl(property.cover_image_path)} sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw" priority />
        </Link>
      </div>

      <div className="flex flex-col rounded-[24px] border border-[var(--color-border)] bg-white p-5 sm:p-6 lg:col-span-5">
        <div className="flex items-center justify-between gap-3">
          <p id="featured-listing-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Recently listed
          </p>
          <div className="flex items-center gap-1.5">
            <ListingStatusBadge status={property.listing_status} />
            {isDemo && <DemoBadge />}
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {property.display_line && <p className="text-lg font-medium leading-snug">{property.display_line}</p>}
            {hidesAddress(property) && (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Exact address shared when available.</p>
            )}
          </div>
          <SaveButton propertyId={property.id} initialSaved={isSaved} isLoggedIn={isLoggedIn} isDemo={isDemo} className="shrink-0 border border-[var(--color-border)]" />
        </div>

        {stats.length > 0 && (
          <dl role="group" aria-label="Key facts" className="mt-6 grid grid-cols-3 gap-4">
            {stats.map((s) => (
              // Reversed so the value reads above its label while the dt/dd
              // order stays valid for assistive technology.
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{s.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-5 text-2xl font-semibold tracking-tight">{price}</p>

        {property.nextOpenHouse && (
          <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
            Open house · {formatOpenHouseShort(property.nextOpenHouse.starts_at, property.nextOpenHouse.ends_at)}
          </p>
        )}
        {isDemo && (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {property.nextOpenHouse ? `${DEMO_COPY.propertyNotice} ${DEMO_COPY.eventNotice}` : DEMO_COPY.propertyNotice}
          </p>
        )}

        {property.seller_username && sellerName && (
          <div role="group" aria-label="Seller" className="mt-5 rounded-[18px] bg-[var(--color-background)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {sellerPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sellerPhoto}
                    alt={sellerName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-foreground)]"
                  >
                    {initialsOf(sellerName)}
                  </span>
                )}
                <Link href={`/@${property.seller_username}`} className="min-w-0 rounded-[8px] text-sm hover:underline">
                  <span className="block truncate font-medium">{sellerName}</span>
                  {property.seller_display_name && (
                    <span className="block truncate text-[var(--color-muted)]">@{property.seller_username}</span>
                  )}
                </Link>
              </div>
              <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">Seller</span>
            </div>

            {property.seller_id && (
              <div className="mt-3">
                <ContactSellerDialog
                  sellerId={property.seller_id}
                  fixedPropertyId={property.id}
                  hasOpenHouse={Boolean(property.has_upcoming_open_house)}
                  isLoggedIn={isLoggedIn}
                  isDemo={isDemo}
                  triggerClassName={cn(buttonVariants({ variant: "secondary", size: "sm", shape: "pill" }), "w-full")}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-6">
          <Link href={href} className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
            View Property
          </Link>
        </div>
      </div>
    </section>
  );
}
