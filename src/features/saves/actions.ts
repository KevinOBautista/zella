"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedUser } from "@/lib/auth/session";
import { demoRejection, isDemoContentError, type DemoRejection } from "@/features/demo/constants";
import { isDemoTarget } from "@/features/demo/server";

export async function toggleSaveAction(propertyId: string): Promise<{ saved: boolean } | { error: string } | DemoRejection> {
  // Demo listings are never saved (also enforced by the database).
  if (await isDemoTarget({ propertyId })) return demoRejection;
  const user = await requireVerifiedUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("property_saves")
    .select("id")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("property_saves").delete().eq("id", existing.id);
    if (error) return { error: "Could not remove from saved homes" };
    revalidatePath("/account/saved");
    return { saved: false };
  }

  const { error } = await supabase.from("property_saves").insert({ property_id: propertyId, user_id: user.id });
  if (isDemoContentError(error)) return demoRejection;
  if (error) return { error: "Could not save this home" };
  revalidatePath("/account/saved");
  return { saved: true };
}
