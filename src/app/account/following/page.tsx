import type { Metadata } from "next";
import { requireVerifiedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SellerCard, type SellerCardData } from "@/features/sellers/components/SellerCard";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Following" };

export default async function FollowingPage() {
  const user = await requireVerifiedUser();
  const supabase = await createClient();
  const { data: follows } = await supabase.from("seller_follows").select("seller_id").eq("follower_user_id", user.id);
  const sellerIds = (follows ?? []).map((f) => f.seller_id);

  const { data } = sellerIds.length
    ? await supabase
        .from("public_seller_profiles")
        .select("id, username, display_name, profile_image_path, city, state, follower_count, for_sale_count, coming_soon_count, has_upcoming_open_house")
        .in("id", sellerIds)
    : { data: [] };

  const sellers = (data ?? []) as SellerCardData[];

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Following</h1>
      {sellers.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sellers.map((s) => (
            <SellerCard key={s.id} seller={s} isFollowing isLoggedIn />
          ))}
        </div>
      ) : (
        <EmptyState title="You're not following any sellers yet." actionLabel="Discover Sellers" actionHref="/sellers" />
      )}
    </div>
  );
}
