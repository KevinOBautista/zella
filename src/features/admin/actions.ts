"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/session";
import { sendTrackedEmail } from "@/lib/email/send";
import { getServerEnv } from "@/config/env";
import type { Enums } from "@/types/database";
import { isDemoContentError } from "@/features/demo/constants";

const DEMO_MANAGED = "Demo content is managed by the demo seed scripts and can't be changed here.";

export type AdminActionResult = { success: true } | { error: string };

export async function adminSetSellerStatusAction(sellerId: string, status: Enums<"seller_status">): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_seller_status", { p_seller_id: sellerId, p_status: status });
  if (isDemoContentError(error)) return { error: DEMO_MANAGED };
  if (error) return { error: "Could not update seller status" };

  if (status === "suspended") {
    try {
      const admin = createAdminClient();
      const { data: seller } = await admin.from("seller_profiles").select("user_id, display_name").eq("id", sellerId).maybeSingle();
      if (seller?.user_id) {
        const env = getServerEnv();
        await admin.from("notifications").insert({
          user_id: seller.user_id,
          type: "account_moderated",
          title: "Your seller account has been suspended",
          body: "Contact support if you believe this is a mistake.",
        });
        const { data: authUser } = await admin.auth.admin.getUserById(seller.user_id);
        if (authUser.user?.email) {
          await sendTrackedEmail({
            emailType: "seller_suspended",
            recipient: authUser.user.email,
            props: {
              previewText: "Your seller account has been suspended",
              heading: "Your seller account has been suspended",
              intro: "Your public profile and active listings have been hidden pending review.",
              ctaLabel: "Contact support",
              ctaUrl: `${env.NEXT_PUBLIC_SITE_URL}/contact`,
            },
          });
        }
      }
    } catch (err) {
      console.error("seller suspension notification failed", err);
    }
  }

  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function adminGrantListingSlotsAction(sellerId: string, additionalSlots: number): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_listing_slots", { p_seller_id: sellerId, p_additional_slots: additionalSlots });
  if (isDemoContentError(error)) return { error: DEMO_MANAGED };
  if (error) return { error: "Could not update listing slots" };
  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function adminSetPropertyModerationAction(propertyId: string, status: Enums<"moderation_status">): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_property_moderation", { p_property_id: propertyId, p_status: status });
  if (isDemoContentError(error)) return { error: DEMO_MANAGED };
  if (error) return { error: "Could not update property moderation status" };

  if (status === "hidden") {
    try {
      const admin = createAdminClient();
      const { data: property } = await admin.from("properties").select("seller_id, title, address_line_1").eq("id", propertyId).maybeSingle();
      if (property) {
        const { data: seller } = await admin.from("seller_profiles").select("user_id").eq("id", property.seller_id).maybeSingle();
        if (seller?.user_id) {
          await admin.from("notifications").insert({
            user_id: seller.user_id,
            type: "listing_moderated",
            title: "A listing was hidden by platform moderation",
            body: property.title ?? property.address_line_1,
            entity_type: "property",
            entity_id: propertyId,
          });
          const { data: authUser } = await admin.auth.admin.getUserById(seller.user_id);
          if (authUser.user?.email) {
            await sendTrackedEmail({
              emailType: "listing_hidden",
              recipient: authUser.user.email,
              props: {
                previewText: "A listing was hidden by moderation",
                heading: "This property has been hidden by platform moderation",
                intro: `${property.title ?? property.address_line_1} is no longer publicly visible. Contact support for details.`,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("moderation notification failed", err);
    }
  }

  revalidatePath("/admin/properties");
  return { success: true };
}

export async function adminResolveReportAction(reportId: string, status: Enums<"report_status">, note?: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId, p_status: status, p_note: note });
  if (error) return { error: "Could not update report" };
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/${reportId}`);
  return { success: true };
}
