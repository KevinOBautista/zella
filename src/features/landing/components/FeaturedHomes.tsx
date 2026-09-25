"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { SaveButton } from "@/features/saves/components/SaveButton";
import { priceLabel, type PropertyCardData } from "@/features/properties/components/PropertyCard";
import { ListingStatusBadge } from "@/features/properties/components/ListingStatusBadge";
import { DemoBadge } from "@/features/demo/components/DemoBadge";
import { DEMO_COPY } from "@/features/demo/constants";

type Item = {
  id: string;
  area: string;
  price: string;
  beds: number | null;
  baths: number | null;
  squareFeet: number | null;
  status: "for_sale" | "coming_soon" | "sold";
  hidesAddress: boolean;
  sellerName: string | null;
  sellerUsername: string | null;
  image: string | null;
  href: string;
  isDemo: boolean;
};

function toItem(p: PropertyCardData): Item {
  const status = p.listing_status === "coming_soon" ? "coming_soon" : p.listing_status === "sold" ? "sold" : "for_sale";
  return {
    id: p.id,
    area: p.display_line ?? "Listing",
    price: priceLabel(p),
    beds: p.bedrooms,
    baths: p.full_bathrooms,
    squareFeet: p.square_feet,
    status,
    hidesAddress: p.address_visibility != null && p.address_visibility !== "full",
    sellerName: p.seller_display_name ?? null,
    sellerUsername: p.seller_username,
    image: propertyImageUrl(p.cover_image_path),
    href: `/homes/${p.slug}`,
    isDemo: Boolean(p.is_demo),
  };
}

/**
 * Newly listed homes with the persisted Save control. Real listings come
 * first (the query orders them); demo listings carry the Demo badge. When
 * nothing is published the section says so instead of showing samples.
 */
export function FeaturedHomes({
  listings,
  savedIds,
  isLoggedIn,
}: {
  listings: PropertyCardData[];
  savedIds: string[];
  isLoggedIn: boolean;
}) {
  const items = listings.map(toItem);
  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const active = items.find((l) => l.id === activeId) ?? items[0] ?? null;
  const saved = new Set(savedIds);

  return (
    <section id="featured-homes" aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="max-w-2xl">
        <h2 id="featured-heading" className="text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
          Find a place that feels right.
        </h2>
        <p className="mt-4 text-base text-[var(--color-muted)]">
          Explore a selection of homes around Buffalo and Western New York.
        </p>
      </div>

      {!active ? (
        <div className="mt-10 flex flex-col items-center rounded-[24px] border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
          <p className="font-medium">New listings will appear here.</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">Sellers across Western New York are getting set up.</p>
          <Link href="/homes" className="mt-5 text-sm font-medium underline-offset-4 hover:underline">
            Explore homes →
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <div
              role="tablist"
              aria-label="Featured listings"
              aria-orientation="vertical"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-[var(--color-border)] lg:px-0 lg:pb-0"
            >
              {items.map((l) => {
                const isActive = l.id === active.id;
                return (
                  <button
                    key={l.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-controls="featured-panel"
                    onClick={() => setActiveId(l.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-left text-sm transition-colors lg:-ml-px lg:rounded-none lg:border-0 lg:border-l-2 lg:py-3 lg:pl-5",
                      isActive
                        ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white lg:bg-transparent lg:text-[var(--color-foreground)]"
                        : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:text-[var(--color-foreground)] lg:border-transparent lg:bg-transparent",
                    )}
                  >
                    <span className={cn("block font-medium", isActive && "lg:font-semibold")}>{l.area}</span>
                    <span className={cn("block text-xs", isActive ? "text-white/80 lg:text-[var(--color-muted)]" : "text-[var(--color-muted-foreground)]")}>
                      {l.isDemo ? `${l.price} · ${DEMO_COPY.badge}` : l.price}
                    </span>
                  </button>
                );
              })}
            </div>
            {items.some((l) => l.isDemo) && (
              <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">Listings marked Demo are samples and are not for sale.</p>
            )}
            <Link href="/homes" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
              Browse all homes →
            </Link>
          </div>

          <div id="featured-panel" role="tabpanel" className="lg:col-span-9">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[var(--color-border)] sm:aspect-[16/10]">
              {items.map((l) =>
                l.image ? (
                  <Image
                    key={l.id}
                    src={l.image}
                    alt=""
                    fill
                    loading={l.id === items[0]!.id ? "eager" : "lazy"}
                    sizes="(min-width: 1280px) 900px, 100vw"
                    className={cn(
                      "object-cover transition-opacity duration-500 motion-reduce:transition-none",
                      l.id === active.id ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden={l.id !== active.id}
                  />
                ) : (
                  <div
                    key={l.id}
                    aria-hidden={l.id !== active.id}
                    className={cn(
                      "absolute inset-0 flex items-center justify-center text-sm text-[var(--color-muted-foreground)]",
                      l.id === active.id ? "opacity-100" : "opacity-0",
                    )}
                  >
                    No photo yet
                  </div>
                ),
              )}

              <div className="absolute left-4 top-4 max-w-[17rem] rounded-[20px] bg-white/95 p-4 shadow-md backdrop-blur sm:left-6 sm:top-6 sm:p-5">
                <div className="flex items-center gap-2">
                  <ListingStatusBadge status={active.status} />
                  {active.isDemo && <DemoBadge />}
                </div>
                <p className="mt-3 text-xl font-semibold">{active.price}</p>
                <p className="text-sm text-[var(--color-muted)]">{active.area}</p>
                {active.hidesAddress && (
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Exact address shared when available.</p>
                )}
                {active.isDemo && <p className="mt-3 text-xs text-[var(--color-muted)]">{DEMO_COPY.propertyNotice}</p>}
              </div>

              <SaveButton
                key={active.id}
                propertyId={active.id}
                initialSaved={saved.has(active.id)}
                isLoggedIn={isLoggedIn}
                isDemo={active.isDemo}
                className="absolute right-4 top-4 h-11 w-11 shadow-md sm:right-6 sm:top-6"
              />
            </div>

            <div className="mt-4 flex flex-col gap-4 rounded-[20px] border border-[var(--color-border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <dl className="grid grid-cols-3 gap-4 sm:flex sm:gap-8">
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">Beds</dt>
                  <dd className="text-lg font-medium">{active.beds ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">Baths</dt>
                  <dd className="text-lg font-medium">{active.baths ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">Sq ft</dt>
                  <dd className="text-lg font-medium">{active.squareFeet != null ? active.squareFeet.toLocaleString() : "—"}</dd>
                </div>
                {active.sellerUsername && (
                  <div className="col-span-3">
                    <dt className="text-xs text-[var(--color-muted-foreground)]">Seller</dt>
                    <dd className="text-sm">
                      {active.sellerName && <span className="font-medium">{active.sellerName} </span>}
                      <span className="text-[var(--color-muted)]">@{active.sellerUsername}</span>
                    </dd>
                  </div>
                )}
              </dl>
              <Link
                href={active.href}
                className="rounded-full bg-[var(--color-foreground)] px-6 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                View Property
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
