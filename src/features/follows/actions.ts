"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedUser } from "@/lib/auth/session";
import { demoRejection, isDemoContentError, type DemoRejection } from "@/features/demo/constants";
import { isDemoTarget } from "@/features/demo/server";

export async function toggleFollowAction(sellerId: string): Promise<{ following: boolean } | { error: string } | DemoRejection> {
  // Demo sellers are never followed (also enforced by the database).
  if (await isDemoTarget({ sellerId })) return demoRejection;
  const user = await requireVerifiedUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("seller_follows")
    .select("id")
    .eq("seller_id", sellerId)
    .eq("follower_user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("seller_follows").delete().eq("id", existing.id);
    if (error) return { error: "Could not unfollow" };
    revalidatePath("/account/following");
    return { following: false };
  }

  const { error } = await supabase.from("seller_follows").insert({
    seller_id: sellerId,
    follower_user_id: user.id,
  });
  if (isDemoContentError(error)) return demoRejection;
  if (error) return { error: "Could not follow" };
  revalidatePath("/account/following");
  return { following: true };
}

export async function updateFollowPreferencesAction(
  sellerId: string,
  prefs: { notifyNewProperties: boolean; notifyComingSoon: boolean; notifyOpenHouses: boolean },
) {
  if (await isDemoTarget({ sellerId })) return demoRejection;
  const user = await requireVerifiedUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("seller_follows")
    .update({
      notify_new_properties: prefs.notifyNewProperties,
      notify_coming_soon: prefs.notifyComingSoon,
      notify_open_houses: prefs.notifyOpenHouses,
    })
    .eq("seller_id", sellerId)
    .eq("follower_user_id", user.id);
  if (error) return { error: "Could not update preferences" };
  revalidatePath("/account/following");
  return { success: true } as const;
}
