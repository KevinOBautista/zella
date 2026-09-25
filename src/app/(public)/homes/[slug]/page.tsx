import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPropertyBySlug } from "@/features/properties/queries";
import { getSavedPropertyIds } from "@/features/properties/queries";
import { getFollowedSellerIds } from "@/features/sellers/queries";
import { propertyImageUrl, avatarUrl } from "@/lib/storage/publicUrl";
import { formatCents } from "@/lib/money";
import { PropertyGallery } from "@/features/properties/components/PropertyGallery";
import { ListingStatusBadge } from "@/features/properties/components/ListingStatusBadge";
import { SaveButton } from "@/features/saves/components/SaveButton";
import { ShareButton } from "@/components/shared/ShareButton";
import { ContactSellerDialog } from "@/features/leads/components/ContactSellerDialog";
import { RSVPDialog } from "@/features/open-houses/components/RSVPDialog";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { FollowButton } from "@/features/follows/components/FollowButton";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { toEmbeddableVideoUrl } from "@/lib/video";
import { DemoBadge } from "@/features/demo/components/DemoBadge";
import { DemoNotice } from "@/features/demo/components/DemoNotice";
import { DEMO_COPY } from "@/features/demo/constants";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPropertyBySlug(slug);
  if (!result) return { title: "Property Unavailable" };
  const { property } = result;
  return {
    title: property.title ?? property.display_line ?? "Property",
    description: property.is_demo ? DEMO_COPY.propertyNotice : property.description?.slice(0, 160),
    // Sample listings are never indexed or presented as real offers.
    robots: property.is_demo ? { index: false, follow: false } : undefined,
    openGraph: {
      images: property.cover_image_path ? [propertyImageUrl(property.cover_image_path)!] : [],
    },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPropertyBySlug(slug);
  if (!result) notFound();

  const { property, images, features, customFeatures, agent, openHouses } = result;
  const propertyId = property.id as string;
  const sellerId = property.seller_id as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [savedIds, followedIds] = await Promise.all([
    user ? getSavedPropertyIds(user.id) : Promise.resolve(new Set<string>()),
    user ? getFollowedSellerIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const isDemo = Boolean(property.is_demo);
  const fallbackAlt = property.title ?? property.display_line ?? "Property photo";
  const galleryImages = images.flatMap((i) => {
    const src = propertyImageUrl(i.storage_path);
    return src ? [{ src, alt: i.alt_text || fallbackAlt, credit: i.credit }] : [];
  });
  // openHouses is already filtered to scheduled + ends_at in the future by
  // the query (see queries.ts) — computing that here would be an impure
  // Date.now() call during render.
  const nextOpenHouse = openHouses[0];
  const embeddedVideo = property.video_url ? toEmbeddableVideoUrl(property.video_url) : null;
  const isSold = property.listing_status === "sold";
  const price =
    property.listing_status === "sold" && property.sold_price_cents
      ? formatCents(property.sold_price_cents)
      : property.pricing_type === "expected_range" && property.expected_price_min_cents && property.expected_price_max_cents
        ? `${formatCents(property.expected_price_min_cents)} – ${formatCents(property.expected_price_max_cents)}`
        : formatCents(property.asking_price_cents);

  return (
    <main className="pb-24 sm:pb-12">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <nav className="mb-4 text-sm text-[var(--color-muted)]">
          <Link href="/homes" className="hover:underline">
            Homes
          </Link>{" "}
          / <span>{property.city}</span>
        </nav>

        <PropertyGallery images={galleryImages} isDemo={isDemo} />

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ListingStatusBadge status={property.listing_status} />
                  {isDemo && <DemoBadge />}
                </div>
                <h1 className="font-display text-3xl">{price}</h1>
                <p className="mt-1 text-[var(--color-muted)]">{property.display_line}</p>
                {isDemo && <DemoNotice className="mt-2">{DEMO_COPY.propertyNotice}</DemoNotice>}
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <SaveButton propertyId={propertyId} initialSaved={savedIds.has(propertyId)} isLoggedIn={Boolean(user)} isDemo={isDemo} className="static bg-transparent shadow-none" />
                <ShareButton title={property.title ?? "Property"} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 border-y border-[var(--color-border)] py-4 text-sm">
              {property.square_feet != null && <Stat label="Sq Ft" value={property.square_feet.toLocaleString()} />}
              {property.bedrooms != null && <Stat label="Beds" value={String(property.bedrooms)} />}
              {property.full_bathrooms != null && <Stat label="Baths" value={String(property.full_bathrooms)} />}
              {property.stories != null && <Stat label="Stories" value={String(property.stories)} />}
              {property.year_built != null && <Stat label="Built" value={String(property.year_built)} />}
            </div>

            {property.description && (
              <section className="mt-6">
                <h2 className="mb-2 text-lg font-semibold">About this property</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-foreground)]">
                  {property.description}
                </p>
              </section>
            )}

            {(features.length > 0 || customFeatures.length > 0) && (
              <section className="mt-6">
                <h2 className="mb-3 text-lg font-semibold">Features</h2>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span key={f.feature_id} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm">
                      {f.name}
                    </span>
                  ))}
                  {customFeatures.map((f) => (
                    <span key={f.id} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm">
                      {f.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {embeddedVideo && (
              <section className="mt-6">
                <h2 className="mb-3 text-lg font-semibold">Video</h2>
                <div className="aspect-video overflow-hidden rounded-[var(--radius-lg)]">
                  <iframe src={embeddedVideo.embedUrl} className="h-full w-full" allowFullScreen title="Property video" />
                </div>
              </section>
            )}
            {!embeddedVideo && property.virtual_tour_url && (
              <p className="mt-4 text-sm">
                <a href={property.virtual_tour_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] underline">
                  View virtual tour
                </a>
              </p>
            )}

            {nextOpenHouse && (
              <section id="open-house" className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Open House</h2>
                  {isDemo && <DemoBadge />}
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  {formatOpenHouseDateTime(nextOpenHouse.starts_at!, nextOpenHouse.ends_at!)}
                </p>
                {isDemo && <DemoNotice className="mt-2">{DEMO_COPY.eventNotice}</DemoNotice>}
              </section>
            )}

            <section className="mt-6 flex items-center gap-2">
              <ReportDialog propertyId={propertyId} />
            </section>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <SellerMiniCard username={property.seller_username} displayName={property.seller_display_name} image={property.seller_profile_image_path} sellerId={sellerId} isFollowing={followedIds.has(sellerId)} isLoggedIn={Boolean(user)} isDemo={isDemo} />
              <div className="border-t border-[var(--color-border)] pt-4">
                {isSold ? (
                  <p className="text-center text-sm text-[var(--color-muted)]">This property has sold.</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm font-medium">Interested in this home?</p>
                    <ContactSellerDialog sellerId={sellerId} fixedPropertyId={propertyId} hasOpenHouse={Boolean(nextOpenHouse)} isLoggedIn={Boolean(user)} isDemo={isDemo} triggerClassName="w-full" />
                  </>
                )}
                {nextOpenHouse && !isSold && (
                  <div className="mt-3">
                    <RSVPDialog
                      openHouseId={nextOpenHouse.id!}
                      startsAt={nextOpenHouse.starts_at!}
                      endsAt={nextOpenHouse.ends_at!}
                      addressLine={property.display_line ?? ""}
                      isDemo={isDemo}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom CTA */}
      {!isSold && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:hidden">
          <p className="flex-1 font-semibold">{price}</p>
          {nextOpenHouse && (
            <RSVPDialog
              openHouseId={nextOpenHouse.id!}
              startsAt={nextOpenHouse.starts_at!}
              endsAt={nextOpenHouse.ends_at!}
              addressLine={property.display_line ?? ""}
              isDemo={isDemo}
            />
          )}
          <ContactSellerDialog sellerId={sellerId} fixedPropertyId={propertyId} hasOpenHouse={Boolean(nextOpenHouse)} isLoggedIn={Boolean(user)} isDemo={isDemo} triggerLabel="Contact" />
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold">{value}</p>
      <p className="text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function SellerMiniCard({
  username,
  displayName,
  image,
  sellerId,
  isFollowing,
  isLoggedIn,
  isDemo,
}: {
  username: string | null;
  displayName: string | null;
  image: string | null;
  sellerId: string;
  isFollowing: boolean;
  isLoggedIn: boolean;
  isDemo: boolean;
}) {
  const avatar = avatarUrl(image);
  return (
    <div className="flex items-center gap-3">
      <Link href={`/@${username}`} className="flex flex-1 items-center gap-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
          {avatar ? (
            <Image src={avatar} alt="" fill className="object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-full items-center justify-center text-sm font-semibold text-[var(--color-accent)]">
              {displayName?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-[var(--color-muted)]">@{username}</p>
        </div>
      </Link>
      <FollowButton sellerId={sellerId} initialFollowing={isFollowing} isLoggedIn={isLoggedIn} isDemo={isDemo} />
    </div>
  );
}
