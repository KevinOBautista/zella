import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/config/env";
import { sendTrackedEmail } from "@/lib/email/send";
import { shouldNotifyFollower } from "@/features/notifications/preferences";

/**
 * Only fires on a first publish into for_sale or coming_soon —
 * never on a later edit or status change. Notifies followers who opted
 * into the matching preference (notify_new_properties / notify_coming_soon
 * on their seller_follows row), both in-app and by email.
 */
export async function notifyFollowersOfNewProperty(params: {
  sellerId: string;
  propertyId: string;
  propertyTitle: string | null;
  addressLine1: string;
  city: string;
  slug: string | null;
  kind: "for_sale" | "coming_soon";
}) {
  const admin = createAdminClient();
  const env = getServerEnv();

  const { data: follows } = await admin
    .from("seller_follows")
    .select("follower_user_id, notify_new_properties, notify_coming_soon")
    .eq("seller_id", params.sellerId);
  if (!follows?.length) return;

  const eventKind = params.kind === "for_sale" ? "new_property" : "coming_soon_property";
  const recipients = follows.filter((f) =>
    shouldNotifyFollower(
      { notifyNewProperties: f.notify_new_properties, notifyComingSoon: f.notify_coming_soon, notifyOpenHouses: false },
      eventKind,
    ),
  );
  if (!recipients.length) return;

  const title = params.propertyTitle ?? params.addressLine1;
  const notificationRows = recipients.map((r) => ({
    user_id: r.follower_user_id,
    type: eventKind as "new_property" | "coming_soon_property",
    title: params.kind === "for_sale" ? "New property listed" : "New Coming Soon property",
    body: `${title} — ${params.city}`,
    entity_type: "property",
    entity_id: params.propertyId,
  }));
  await admin.from("notifications").insert(notificationRows);

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, email_followed_new_properties, email_followed_coming_soon")
    .in(
      "user_id",
      recipients.map((r) => r.follower_user_id),
    );

  const emailEligibleUserIds = new Set(
    (prefs ?? [])
      .filter((p) => (params.kind === "for_sale" ? p.email_followed_new_properties : p.email_followed_coming_soon))
      .map((p) => p.user_id),
  );
  if (emailEligibleUserIds.size === 0) return;

  const propertyUrl = params.slug ? `${env.NEXT_PUBLIC_SITE_URL}/homes/${params.slug}` : env.NEXT_PUBLIC_SITE_URL;

  for (const userId of emailEligibleUserIds) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    if (!authUser.user?.email) continue;
    await sendTrackedEmail({
      emailType: params.kind === "for_sale" ? "new_property" : "coming_soon_property",
      recipient: authUser.user.email,
      props: {
        previewText: title,
        heading: params.kind === "for_sale" ? "A seller you follow just listed a new property" : "A seller you follow has a new Coming Soon property",
        intro: `${title} in ${params.city}.`,
        ctaLabel: "View property",
        ctaUrl: propertyUrl,
        footnote: "You're receiving this because you follow this seller. Manage this in your account settings.",
      },
    });
  }
}
