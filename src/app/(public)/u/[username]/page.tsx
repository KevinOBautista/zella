import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSellerByUsername, getFollowedSellerIds } from "@/features/sellers/queries";
import { getSavedPropertyIds } from "@/features/properties/queries";
import { avatarUrl } from "@/lib/storage/publicUrl";
import { FollowButton } from "@/features/follows/components/FollowButton";
import { ContactSellerDialog } from "@/features/leads/components/ContactSellerDialog";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { OpenHouseBadge } from "@/features/open-houses/components/OpenHouseBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCents } from "@/lib/money";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { DemoBadge } from "@/features/demo/components/DemoBadge";
import { DemoNotice } from "@/features/demo/components/DemoNotice";
import { DEMO_COPY } from "@/features/demo/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await getSellerByUsername(username);
  if (!result) return { title: "Seller Not Found" };
  const isDemo = Boolean(result.seller.is_demo);
  return {
    title: result.seller.display_name ?? username,
    description: isDemo ? DEMO_COPY.sellerNotice : (result.seller.bio ?? undefined),
    // Demo profiles are sample content and are never indexed.
    robots: isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const result = await getSellerByUsername(username);
  if (!result) notFound();

  const { seller, forSale, comingSoon, sold, openHouses } = result;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [savedIds, followedIds] = await Promise.all([
    user ? getSavedPropertyIds(user.id) : Promise.resolve(new Set<string>()),
    user ? getFollowedSellerIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const activeTab = tab === "coming_soon" ? "coming_soon" : tab === "sold" ? "sold" : "for_sale";
  const tabProperties = activeTab === "for_sale" ? forSale : activeTab === "coming_soon" ? comingSoon : sold;
  const image = avatarUrl(seller.profile_image_path);
  const sellerId = seller.id as string;
  const isDemo = Boolean(seller.is_demo);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl font-semibold text-[var(--color-accent)]">
              {seller.display_name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-display text-2xl">{seller.display_name}</h1>
            {isDemo && <DemoBadge />}
          </div>
          <p className="text-[var(--color-muted)]">@{seller.username}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {seller.city}, {seller.state}
          </p>
          {isDemo && <DemoNotice className="mt-3 justify-center sm:justify-start">{DEMO_COPY.sellerNotice}</DemoNotice>}
          {seller.bio && <p className="mt-3 max-w-xl text-sm">{seller.bio}</p>}
          {!isDemo && <p className="mt-3 text-sm text-[var(--color-muted)]">{seller.follower_count ?? 0} followers</p>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <FollowButton sellerId={sellerId} initialFollowing={followedIds.has(sellerId)} isLoggedIn={Boolean(user)} size="md" isDemo={isDemo} />
            <ContactSellerDialog
              sellerId={sellerId}
              sellerProperties={forSale.map((p) => ({ id: p.id, label: p.display_line ?? p.id }))}
              isLoggedIn={Boolean(user)}
              isDemo={isDemo}
            />
            <ReportDialog sellerId={sellerId} />
          </div>
        </div>
      </div>

      {openHouses.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">{isDemo ? "Demo Open Houses" : "Upcoming Open Houses"}</h2>
          {isDemo && <DemoNotice className="-mt-2 mb-4">{DEMO_COPY.eventNotice}</DemoNotice>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openHouses
              .map((oh) => (
                <Link
                  key={oh.id}
                  href={`/homes/${oh.property_slug}`}
                  className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)]">
                    {oh.cover_image_path && (
                      <Image src={propertyImageUrl(oh.cover_image_path)!} alt="" fill className="object-cover" />
                    )}
                  </div>
                  <div>
                    <OpenHouseBadge startsAt={oh.starts_at!} endsAt={oh.ends_at!} isDemo={Boolean(oh.is_demo)} />
                    <p className="mt-1 text-sm font-medium">{formatCents(oh.asking_price_cents)}</p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-6 flex gap-6 border-b border-[var(--color-border)]">
          <TabLink href={`/@${username}`} active={activeTab === "for_sale"}>
            For Sale ({forSale.length})
          </TabLink>
          <TabLink href={`/@${username}?tab=coming_soon`} active={activeTab === "coming_soon"}>
            Coming Soon ({comingSoon.length})
          </TabLink>
          <TabLink href={`/@${username}?tab=sold`} active={activeTab === "sold"}>
            Sold ({sold.length})
          </TabLink>
        </div>
        {tabProperties.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tabProperties.map((p) => (
              <PropertyCard key={p.id} property={p} isSaved={savedIds.has(p.id)} isLoggedIn={Boolean(user)} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing here yet" />
        )}
      </section>
    </main>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 pb-3 text-sm font-medium ${
        active ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--color-muted)]"
      }`}
    >
      {children}
    </Link>
  );
}
