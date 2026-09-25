import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatCents } from "@/lib/money";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { formatOpenHouseDateTimeZoned, formatOpenHouseShort } from "@/features/open-houses/format";
import { SaveButton } from "@/features/saves/components/SaveButton";
import { OverflowMenu, type OverflowMenuItem } from "@/components/ui/overflow-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardImage } from "./CardImage";
import { ListingStatusBadge } from "./ListingStatusBadge";
import { DemoBadge } from "@/features/demo/components/DemoBadge";
import { DEMO_COPY } from "@/features/demo/constants";
import type { Tables } from "@/types/database";

// Postgres views don't preserve NOT NULL, so every raw public_properties
// column is nullable in the generated types even though `id`/`slug` are
// never actually null for a published, queryable row. queries.ts casts to
// this DTO once at the read boundary so every consumer gets a plain
// `string` instead of repeating a non-null assertion everywhere.
export type PropertyCardData = Pick<
  Tables<"public_properties">,
  | "listing_status"
  | "asking_price_cents"
  | "expected_price_min_cents"
  | "expected_price_max_cents"
  | "pricing_type"
  | "sold_price_cents"
  | "display_line"
  | "bedrooms"
  | "full_bathrooms"
  | "square_feet"
  | "cover_image_path"
  | "has_upcoming_open_house"
  | "seller_username"
> &
  Partial<
    Pick<
      Tables<"public_properties">,
      | "half_bathrooms"
      | "seller_id"
      | "seller_display_name"
      | "seller_profile_image_path"
      | "address_visibility"
      | "property_type"
      | "city"
      | "is_demo"
    >
  > & {
    id: string;
    slug: string;
    nextOpenHouse?: { starts_at: string; ends_at: string } | null;
  };

/**
 * The seller's own inventory: a draft has no public slug yet, and the card
 * links into the management route instead of the public listing.
 */
export type SellerPropertyCardData = Omit<PropertyCardData, "slug"> & {
  slug: string | null;
  title?: string | null;
  canScheduleOpenHouse?: boolean;
};

export function priceLabel(p: PropertyCardData | SellerPropertyCardData): string {
  if (p.listing_status === "sold" && p.sold_price_cents) return formatCents(p.sold_price_cents);
  if (p.pricing_type === "expected_range" && p.expected_price_min_cents && p.expected_price_max_cents) {
    return `${formatCents(p.expected_price_min_cents)} – ${formatCents(p.expected_price_max_cents)}`;
  }
  return formatCents(p.asking_price_cents);
}

export function bathsLabel(full: number | null | undefined, half: number | null | undefined): string | null {
  if (full == null && half == null) return null;
  const total = (full ?? 0) + (half ?? 0) * 0.5;
  return `${total} ba`;
}

export type SpecsFields = {
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms?: number | null;
  square_feet: number | null;
};

/** "3 bd · 2.5 ba · 1,500 sqft" with unknown pieces omitted (never zero-filled). */
export function specsLabel(p: SpecsFields): string | null {
  const parts = [
    p.bedrooms != null ? `${p.bedrooms} bd` : null,
    bathsLabel(p.full_bathrooms, p.half_bathrooms),
    p.square_feet != null ? `${p.square_feet.toLocaleString("en-US")} sqft` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function hidesAddress(p: PropertyCardData | SellerPropertyCardData): boolean {
  return p.address_visibility != null && p.address_visibility !== "full";
}

/**
 * Photo-led listing card, shared by /homes and the seller's own inventory
 * grid so both stay identical in proportion, typography and spacing.
 *
 * Public variant: the photo and the price block are separate links to the
 * listing, the seller row links to the seller profile, and Save is a
 * sibling button. Seller variant: the links point at the management route,
 * Save is replaced by an overflow menu of management actions, and the
 * seller identity row is dropped (the seller is looking at their own
 * inventory). In both, nothing interactive is nested inside a link.
 *
 * The variant only chooses presentation and which actions are offered —
 * data fetching and ownership checks stay in the page that renders it.
 */
export function PropertyCard({
  property,
  variant = "public",
  isSaved = false,
  isLoggedIn = false,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  openHouseEvent,
}: {
  property: PropertyCardData | SellerPropertyCardData;
  variant?: "public" | "seller";
  isSaved?: boolean;
  isLoggedIn?: boolean;
  priority?: boolean;
  sizes?: string;
  /**
   * When set, renders this specific event's date/time (with time zone) and a
   * "View Open House" action instead of the compact "next open house" line —
   * used on /open-houses, where each card is one scheduled event rather than
   * a property summary.
   */
  openHouseEvent?: { id: string; startsAt: string; endsAt: string };
}) {
  const isSeller = variant === "seller";
  const isDemo = Boolean(property.is_demo);
  const seller = property as SellerPropertyCardData;
  const href = isSeller ? `/dashboard/properties/${property.id}` : `/homes/${property.slug}`;
  const price = priceLabel(property);
  const specs = specsLabel(property);
  const label = isSeller
    ? `Manage ${seller.title || property.display_line || "property"}`
    : `View listing: ${price}, ${property.display_line ?? ""}`;

  const menuItems: OverflowMenuItem[] = isSeller
    ? [
        { label: "Edit Property", href: `/dashboard/properties/${property.id}/edit?step=1` },
        {
          label: property.cover_image_path ? "Manage Photos" : "Add Photos",
          href: `/dashboard/properties/${property.id}/edit?step=6`,
        },
        ...(seller.canScheduleOpenHouse
          ? [{ label: "Schedule Open House", href: `/dashboard/open-houses/new?propertyId=${property.id}` }]
          : []),
        ...(property.slug ? [{ label: "View Public Listing", href: `/homes/${property.slug}`, external: true }] : []),
      ]
    : [];

  return (
    <article className="group flex flex-col">
      {/* The photo is clipped to its rounded corners, so the badge and the
          actions live in this wrapper instead — an overflow-hidden ancestor
          would cut off the seller menu's dropdown. */}
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[var(--color-border)]">
          <Link href={href} aria-label={label} className="absolute inset-0 block">
            <CardImage src={propertyImageUrl(property.cover_image_path)} sizes={sizes} priority={priority} />
          </Link>
        </div>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <ListingStatusBadge status={property.listing_status} />
          {isDemo && <DemoBadge onImage />}
        </div>
        <div className="absolute right-3 top-3">
          {isSeller ? (
            <OverflowMenu label="Property actions" items={menuItems} />
          ) : (
            <SaveButton propertyId={property.id} initialSaved={isSaved} isLoggedIn={isLoggedIn} isDemo={isDemo} />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        <Link href={href} className="block rounded-[8px]">
          {isSeller && seller.title && (
            <p className="truncate font-medium text-[var(--color-foreground)]">{seller.title}</p>
          )}
          <p className="text-lg font-semibold text-[var(--color-foreground)]">{price}</p>
          {specs && <p className="text-sm text-[var(--color-muted)]">{specs}</p>}
          {property.display_line && <p className="text-sm text-[var(--color-muted)]">{property.display_line}</p>}
          {hidesAddress(property) && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {isSeller ? "Exact address hidden publicly." : "Exact address shared when available."}
            </p>
          )}
        </Link>
        {openHouseEvent ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)]">
            <CalendarDays size={15} aria-hidden="true" />
            <span>{formatOpenHouseDateTimeZoned(openHouseEvent.startsAt, openHouseEvent.endsAt)}</span>
          </p>
        ) : (
          property.nextOpenHouse && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)]">
              <CalendarDays size={15} aria-hidden="true" />
              <span>Open house · {formatOpenHouseShort(property.nextOpenHouse.starts_at, property.nextOpenHouse.ends_at)}</span>
            </p>
          )
        )}
        {isDemo && (openHouseEvent || property.nextOpenHouse) && (
          <p className="text-xs text-[var(--color-muted-foreground)]">{DEMO_COPY.eventNotice}</p>
        )}
        {isSeller ? (
          <Link
            href={href}
            className="mt-2 inline-flex self-start rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)]"
          >
            Manage Property
          </Link>
        ) : (
          property.seller_username && (
            <Link href={`/@${property.seller_username}`} className="mt-1 inline-flex flex-wrap items-baseline gap-x-1.5 self-start text-sm hover:underline">
              <span className="font-medium text-[var(--color-foreground)]">{property.seller_display_name ?? `@${property.seller_username}`}</span>
              {property.seller_display_name && <span className="text-[var(--color-muted)]">@{property.seller_username}</span>}
            </Link>
          )
        )}
        {openHouseEvent && (
          <Link href={`${href}#open-house`} className={cn(buttonVariants({ variant: "secondary", size: "sm", shape: "pill" }), "mt-2 self-start")}>
            View Open House
          </Link>
        )}
      </div>
    </article>
  );
}
