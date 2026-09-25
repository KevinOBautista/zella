"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSeller } from "@/lib/auth/session";
import type { Enums } from "@/types/database";

export type StatusChangeResult = { success: true } | { error: string };

export async function changePropertyStatusAction(
  propertyId: string,
  targetStatus: Enums<"property_status">,
  soldPriceCents?: number,
): Promise<StatusChangeResult> {
  const { isSuspended } = await requireSeller();
  if (isSuspended) return { error: "Your account is suspended." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_property_status", {
    p_property_id: propertyId,
    p_target_status: targetStatus,
    ...(soldPriceCents ? { p_sold_price_cents: soldPriceCents } : {}),
  });

  if (error) {
    if (error.message.includes("limit")) {
      return { error: "You have reached your five active property limit. Additional listing capacity will be available later." };
    }
    return { error: "Could not update status. Please try again." };
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}`);
  return { success: true };
}

export async function deletePropertyDraftAction(propertyId: string): Promise<StatusChangeResult> {
  const { seller } = await requireSeller();
  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("seller_id, listing_status").eq("id", propertyId).maybeSingle();
  if (!property || property.seller_id !== seller.id) return { error: "Not found" };
  if (property.listing_status !== "draft") return { error: "Only drafts can be deleted" };

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) return { error: "Could not delete draft" };
  revalidatePath("/dashboard/properties");
  return { success: true };
}
