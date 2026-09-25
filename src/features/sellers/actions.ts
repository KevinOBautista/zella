"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedUser } from "@/lib/auth/session";
import { sellerProfileSchema } from "@/features/sellers/schemas";

export type SellerFormResult = { error: string; field?: string } | { success: true };

function readSellerFormInput(formData: FormData) {
  return {
    accountType: formData.get("accountType"),
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    bio: formData.get("bio"),
    city: formData.get("city"),
    state: formData.get("state"),
    websiteUrl: formData.get("websiteUrl"),
    instagramUrl: formData.get("instagramUrl"),
  };
}

export async function createSellerProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<SellerFormResult> {
  const user = await requireVerifiedUser();
  const parsed = sellerProfileSchema.safeParse(readSellerFormInput(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Invalid input", field: issue?.path[0] as string | undefined };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("seller_profiles").insert({
    user_id: user.id,
    account_type: parsed.data.accountType,
    display_name: parsed.data.displayName,
    username: parsed.data.username,
    bio: parsed.data.bio,
    city: parsed.data.city,
    state: parsed.data.state.toUpperCase(),
    website_url: parsed.data.websiteUrl,
    instagram_url: parsed.data.instagramUrl,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken", field: "username" };
    }
    return { error: "Something went wrong creating your seller profile. Please try again." };
  }

  redirect("/onboarding/complete");
}

export async function updateSellerProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<SellerFormResult> {
  const user = await requireVerifiedUser();
  const parsed = sellerProfileSchema.safeParse(readSellerFormInput(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Invalid input", field: issue?.path[0] as string | undefined };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("seller_profiles")
    .update({
      display_name: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio,
      city: parsed.data.city,
      state: parsed.data.state.toUpperCase(),
      website_url: parsed.data.websiteUrl,
      instagram_url: parsed.data.instagramUrl,
    })
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken", field: "username" };
    }
    return { error: "Something went wrong saving your profile. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  return { success: true };
}
