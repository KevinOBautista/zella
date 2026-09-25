import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/config/env";
import { sendTrackedEmail } from "@/lib/email/send";

/**
 * Lead routing and notification: always creates the
 * in-app notification and stores the lead in the seller dashboard first;
 * email delivery is best-effort and never affects the caller's result.
 */
export async function notifySellerOfInquiry(params: {
  inquiryId: string;
  sellerId: string;
  propertyId: string | null;
  buyerName: string;
  inquiryTypeLabel: string;
}) {
  const admin = createAdminClient();
  const env = getServerEnv();

  const { data: seller } = await admin
    .from("seller_profiles")
    .select("user_id, display_name, is_demo")
    .eq("id", params.sellerId)
    .maybeSingle();
  // Demo sellers have no owner and never receive leads.
  if (!seller || seller.is_demo || !seller.user_id) return;
  const sellerUserId = seller.user_id;

  let leadRecipient: "seller" | "agent" | "both" = "seller";
  let agent: { name: string; email: string | null } | null = null;

  if (params.propertyId) {
    const { data: property } = await admin
      .from("properties")
      .select("lead_recipient, title, address_line_1, city")
      .eq("id", params.propertyId)
      .maybeSingle();
    if (property) leadRecipient = property.lead_recipient;

    if (leadRecipient !== "seller") {
      const { data: agentRow } = await admin
        .from("property_agents")
        .select("name, email")
        .eq("property_id", params.propertyId)
        .maybeSingle();
      if (agentRow) agent = agentRow;
    }
  }

  // In-app notification always goes to the seller regardless of email
  // routing — the dashboard is always the record of the lead.
  const { data: notification } = await admin
    .from("notifications")
    .insert({
      user_id: sellerUserId,
      type: "new_lead",
      title: "New buyer inquiry",
      body: `${params.buyerName} sent a ${params.inquiryTypeLabel.toLowerCase()}.`,
      entity_type: "inquiry",
      entity_id: params.inquiryId,
    })
    .select("id")
    .single();

  const ctaUrl = `${env.NEXT_PUBLIC_SITE_URL}/dashboard/leads/${params.inquiryId}`;

  if (leadRecipient === "seller" || leadRecipient === "both") {
    const { data: authUser } = await admin.auth.admin.getUserById(sellerUserId);
    if (authUser.user?.email) {
      await sendTrackedEmail({
        emailType: "new_inquiry_seller",
        recipient: authUser.user.email,
        notificationId: notification?.id,
        props: {
          previewText: `New inquiry from ${params.buyerName}`,
          heading: "You have a new buyer inquiry",
          intro: `${params.buyerName} sent a ${params.inquiryTypeLabel.toLowerCase()} through your listing.`,
          ctaLabel: "View in your dashboard",
          ctaUrl,
        },
      });
    }
  }

  if ((leadRecipient === "agent" || leadRecipient === "both") && agent?.email) {
    await sendTrackedEmail({
      emailType: "new_inquiry_agent",
      recipient: agent.email,
      notificationId: notification?.id,
      props: {
        previewText: `New inquiry from ${params.buyerName}`,
        heading: "New buyer inquiry",
        intro: `${params.buyerName} inquired about a property listed by ${seller.display_name}. This lead is also recorded in the seller's dashboard.`,
        footnote: "You're receiving this because you're listed as the agent for this property.",
      },
    });
  }
}
