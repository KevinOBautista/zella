import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { avatarUrl } from "@/lib/storage/publicUrl";
import { FollowButton } from "@/features/follows/components/FollowButton";
import type { Tables } from "@/types/database";
import { DemoBadge } from "@/features/demo/components/DemoBadge";

// See PropertyCard.tsx for why `id` is re-declared non-null here — the
// view's generated type loses NOT NULL on every column.
export type SellerCardData = Pick<
  Tables<"public_seller_profiles">,
  "username" | "display_name" | "profile_image_path" | "city" | "state" | "follower_count" | "for_sale_count" | "coming_soon_count" | "has_upcoming_open_house"
> &
  Partial<Pick<Tables<"public_seller_profiles">, "is_demo">> & { id: string };

export function SellerCard({
  seller,
  isFollowing = false,
  isLoggedIn = false,
}: {
  seller: SellerCardData;
  isFollowing?: boolean;
  isLoggedIn?: boolean;
}) {
  const image = avatarUrl(seller.profile_image_path);
  const isDemo = Boolean(seller.is_demo);

  return (
    <Card className="flex flex-col items-center gap-3 p-6 text-center">
      <Link href={`/@${seller.username}`} className="flex flex-col items-center gap-3">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xl font-semibold text-[var(--color-accent)]">
              {seller.display_name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          {isDemo && <DemoBadge className="mb-1.5" />}
          <p className="font-medium">{seller.display_name}</p>
          <p className="text-sm text-[var(--color-muted)]">@{seller.username}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {seller.city}, {seller.state}
          </p>
        </div>
      </Link>
      {isDemo ? (
        // Demo sellers show their sample inventory only; they have no real
        // followers or activity to report.
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {seller.for_sale_count ?? 0} sample for sale · {seller.coming_soon_count ?? 0} sample coming soon
        </p>
      ) : (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {seller.for_sale_count ?? 0} for sale · {seller.coming_soon_count ?? 0} coming soon ·{" "}
          {seller.follower_count ?? 0} followers
        </p>
      )}
      {seller.has_upcoming_open_house && (
        <p className="text-xs font-medium text-[var(--color-accent)]">
          {isDemo ? "Has a demo open house" : "Has an upcoming open house"}
        </p>
      )}
      <FollowButton sellerId={seller.id} initialFollowing={isFollowing} isLoggedIn={isLoggedIn} isDemo={isDemo} />
    </Card>
  );
}
