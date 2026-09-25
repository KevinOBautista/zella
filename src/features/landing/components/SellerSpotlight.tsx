import Image from "next/image";
import Link from "next/link";
import { avatarUrl } from "@/lib/storage/publicUrl";
import { FollowButton } from "@/features/follows/components/FollowButton";
import type { SellerCardData } from "@/features/sellers/components/SellerCard";
import { DemoBadge } from "@/features/demo/components/DemoBadge";
import { DEMO_COPY } from "@/features/demo/constants";

/**
 * Real seller card for the landing page, same layout as DemoSellerProfile
 * but backed by public_seller_profiles and the persisted Follow action.
 * The public view exposes for-sale / coming-soon / follower counts only
 * (no sold count), so that is all we show.
 */
export function SellerSpotlight({
  seller,
  isFollowing,
  isLoggedIn,
}: {
  seller: SellerCardData;
  isFollowing: boolean;
  isLoggedIn: boolean;
}) {
  const image = avatarUrl(seller.profile_image_path);
  const isDemo = Boolean(seller.is_demo);
  // A demo seller's counts describe its sample inventory; it has no followers.
  const stats = isDemo
    ? [
        { label: "Sample for sale", value: seller.for_sale_count ?? 0 },
        { label: "Sample coming soon", value: seller.coming_soon_count ?? 0 },
      ]
    : [
        { label: "For sale", value: seller.for_sale_count ?? 0 },
        { label: "Coming soon", value: seller.coming_soon_count ?? 0 },
        { label: "Followers", value: seller.follower_count ?? 0 },
      ];

  return (
    <div className="w-full max-w-sm rounded-[24px] bg-white/95 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center gap-4">
        <Link href={`/@${seller.username}`} className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#5b6b7a] text-lg font-semibold text-white">
            {image ? (
              <Image src={image} alt="" fill sizes="56px" className="object-cover" />
            ) : (
              (seller.display_name ?? "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold">
              <span className="truncate">{seller.display_name}</span>
              {isDemo && <DemoBadge />}
            </p>
            <p className="truncate text-sm text-[var(--color-muted)]">@{seller.username}</p>
            {(seller.city || seller.state) && (
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {[seller.city, seller.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </Link>
        <FollowButton sellerId={seller.id} initialFollowing={isFollowing} isLoggedIn={isLoggedIn} isDemo={isDemo} />
      </div>

      <dl className={`mt-5 grid ${isDemo ? "grid-cols-2" : "grid-cols-3"} gap-1 rounded-full bg-[var(--color-background)] p-1`}>
        {stats.map((s) => (
          <div key={s.label} className="rounded-full px-3 py-1.5 text-center">
            <dd className="text-sm font-medium">{s.value}</dd>
            <dt className="text-xs text-[var(--color-muted-foreground)]">{s.label}</dt>
          </div>
        ))}
      </dl>
      {seller.has_upcoming_open_house && !isDemo && (
        <p className="mt-3 text-xs font-medium text-[var(--color-accent)]">Has an upcoming open house</p>
      )}
      {isDemo && <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{DEMO_COPY.sellerNotice}</p>}
    </div>
  );
}
