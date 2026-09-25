"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth/session";
import { rsvpSchema } from "@/features/open-houses/schemas";
import { validateOpenHouseWindow, canScheduleOpenHouse } from "@/features/open-houses/domain";
import { checkRateLimit } from "@/lib/rate-limit";
import { limits } from "@/config/limits";
import { sendTrackedEmail } from "@/lib/email/send";
import { getServerEnv } from "@/config/env";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isHoneypotTriggered } from "@/lib/anti-spam/honeypot";
import { verifyTurnstile } from "@/lib/turnstile/verify";
import { demoRejection, isDemoContentError, type DemoRejection } from "@/features/demo/constants";
import { isDemoTarget } from "@/features/demo/server";

export type SubmitRsvpResult = { success: true; rsvpId: string } | { error: string } | DemoRejection;

export async function submitRsvpAction(rawInput: unknown): Promise<SubmitRsvpResult> {
  const parsed = rsvpSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your information and try again." };
  }
  const input = parsed.data;

  // Demo events never collect RSVPs or send confirmations.
  if (await isDemoTarget({ openHouseId: input.openHouseId })) return demoRejection;

  const extra = rawInput as { honeypot?: string; turnstileToken?: string };
  if (isHoneypotTriggered(extra.honeypot)) {
    return { success: true, rsvpId: crypto.randomUUID() };
  }
  if (!(await verifyTurnstile(extra.turnstileToken ?? null))) {
    return { error: "We couldn't verify your submission. Please try again." };
  }

  const allowed = await checkRateLimit(["rsvp"], limits.rateLimit.rsvp);
  if (!allowed) return { error: "Too many RSVPs submitted. Please try again later." };

  const admin = createAdminClient();

  const { data: existingByIdempotency } = await admin
    .from("open_house_rsvps")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existingByIdempotency) return { success: true, rsvpId: existingByIdempotency.id };

  const { data: openHouse } = await admin
    .from("open_houses")
    .select("*, properties(title, slug, address_line_1, city, state, seller_id)")
    .eq("id", input.openHouseId)
    .maybeSingle();
  if (!openHouse || openHouse.status !== "scheduled") {
    return { error: "This open house is no longer accepting RSVPs." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A duplicate email for the same open house updates the
  // existing RSVP instead of creating a new one.
  const { data: existingByEmail } = await admin
    .from("open_house_rsvps")
    .select("id")
    .eq("open_house_id", input.openHouseId)
    .ilike("email", input.email)
    .eq("status", "confirmed")
    .maybeSingle();

  const rsvpFields = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    party_size: input.partySize,
    agent_status: input.agentStatus,
    message: input.message,
  };

  let rsvpId: string;
  if (existingByEmail) {
    await admin.from("open_house_rsvps").update(rsvpFields).eq("id", existingByEmail.id);
    rsvpId = existingByEmail.id;
  } else {
    const { data: created, error } = await admin
      .from("open_house_rsvps")
      .insert({ ...rsvpFields, open_house_id: input.openHouseId, user_id: user?.id ?? null, idempotency_key: input.idempotencyKey })
      .select("id")
      .single();
    if (isDemoContentError(error)) return demoRejection;
    if (error || !created) return { error: "Something went wrong submitting your RSVP. Please try again." };
    rsvpId = created.id;
  }

  try {
    await notifySellerAndGuestOfRsvp(openHouse, rsvpId, input);
  } catch (err) {
    console.error("RSVP notification failed", err);
  }

  return { success: true, rsvpId };
}

async function notifySellerAndGuestOfRsvp(
  openHouse: { id: string; starts_at: string; ends_at: string; properties: { title: string | null; slug: string | null; address_line_1: string; city: string; state: string; seller_id: string } | null },
  rsvpId: string,
  input: z.infer<typeof rsvpSchema>,
) {
  const admin = createAdminClient();
  const env = getServerEnv();
  if (!openHouse.properties) return;
  const property = openHouse.properties;
  const dateTimeLabel = formatOpenHouseDateTime(openHouse.starts_at, openHouse.ends_at);
  const propertyUrl = `${env.NEXT_PUBLIC_SITE_URL}/homes/${property.slug}`;

  const { data: seller } = await admin.from("seller_profiles").select("user_id, is_demo").eq("id", property.seller_id).maybeSingle();
  if (seller?.is_demo) return;
  if (seller?.user_id) {
    const { data: notification } = await admin
      .from("notifications")
      .insert({
        user_id: seller.user_id,
        type: "open_house_rsvp",
        title: "New open house RSVP",
        body: `${input.firstName} ${input.lastName} RSVP'd (party of ${input.partySize}).`,
        entity_type: "open_house",
        entity_id: openHouse.id,
      })
      .select("id")
      .single();

    const { data: authUser } = await admin.auth.admin.getUserById(seller.user_id);
    if (authUser.user?.email) {
      await sendTrackedEmail({
        emailType: "new_open_house_rsvp",
        recipient: authUser.user.email,
        notificationId: notification?.id,
        props: {
          previewText: `${input.firstName} ${input.lastName} RSVP'd to your open house`,
          heading: "New open house RSVP",
          intro: `${input.firstName} ${input.lastName} (party of ${input.partySize}) RSVP'd for your open house at ${property.address_line_1}, ${property.city}.`,
          ctaLabel: "View property",
          ctaUrl: propertyUrl,
        },
      });
    }
  }

  await sendTrackedEmail({
    emailType: "rsvp_confirmation",
    recipient: input.email,
    props: {
      previewText: "You're registered for this open house",
      heading: "You're registered.",
      intro: `You're confirmed for the open house at ${property.address_line_1}, ${property.city}, ${property.state}.`,
      bullets: [{ label: "When", value: dateTimeLabel }],
      ctaLabel: "View property",
      ctaUrl: propertyUrl,
    },
  });
}

export async function cancelOwnRsvpAction(rsvpId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("open_house_rsvps")
    .update({ status: "cancelled" })
    .eq("id", rsvpId)
    .eq("user_id", user.id);
  if (error) return { error: "Could not cancel RSVP" };
  revalidatePath("/account/rsvps");
  return { success: true } as const;
}

// ---- Seller-owned open house management ------------------------------------

const createOpenHouseSchema = z.object({
  propertyId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  registrationType: z.enum(["none", "optional", "required"]),
  instructions: z.string().trim().max(1000).optional(),
  hostType: z.enum(["seller", "agent", "both"]),
});

export async function createOpenHouseAction(rawInput: unknown) {
  const { seller, isSuspended } = await requireSeller();
  if (isSuspended) return { error: "Your account is suspended." };

  const parsed = createOpenHouseSchema.safeParse(rawInput);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, seller_id, address_visibility, listing_status")
    .eq("id", input.propertyId)
    .maybeSingle();
  if (!property || property.seller_id !== seller.id) return { error: "Property not found" };

  const eligibility = canScheduleOpenHouse({
    addressVisibility: property.address_visibility,
    listingStatus: property.listing_status,
  });
  if (!eligibility.ok) return { error: eligibility.reason };

  const windowErrors = validateOpenHouseWindow({
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    now: new Date(),
  });
  if (windowErrors.length) return { error: windowErrors[0]!.message };

  const { data: openHouse, error } = await supabase
    .from("open_houses")
    .insert({
      property_id: input.propertyId,
      seller_id: seller.id,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      registration_type: input.registrationType,
      instructions: input.instructions || null,
      host_type: input.hostType,
    })
    .select("id")
    .single();
  if (error || !openHouse) return { error: "Could not create open house" };

  await supabase.from("property_activity").insert({
    property_id: input.propertyId,
    seller_id: seller.id,
    event_type: "open_house_created",
    metadata: { open_house_id: openHouse.id },
  });

  try {
    await notifyFollowersOfOpenHouse(seller.id, openHouse.id, "open_house_created");
  } catch (err) {
    console.error("follower notification failed", err);
  }

  revalidatePath("/dashboard/open-houses");
  return { success: true, openHouseId: openHouse.id } as const;
}

export async function cancelOpenHouseAction(openHouseId: string, reason?: string) {
  await requireSeller();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_open_house", { p_open_house_id: openHouseId, p_reason: reason });
  if (error) return { error: "Could not cancel open house" };

  try {
    await notifyOfCancelledOpenHouse(openHouseId);
  } catch (err) {
    console.error("cancellation notification failed", err);
  }

  revalidatePath("/dashboard/open-houses");
  revalidatePath(`/dashboard/open-houses/${openHouseId}`);
  return { success: true } as const;
}

async function notifyFollowersOfOpenHouse(sellerId: string, openHouseId: string, kind: "open_house_created") {
  const admin = createAdminClient();
  const { data: followers } = await admin
    .from("seller_follows")
    .select("follower_user_id, notify_open_houses")
    .eq("seller_id", sellerId)
    .eq("notify_open_houses", true);
  if (!followers?.length) return;

  const { data: openHouse } = await admin
    .from("open_houses")
    .select("starts_at, ends_at, properties(slug, address_line_1, city)")
    .eq("id", openHouseId)
    .maybeSingle();
  if (!openHouse?.properties) return;

  const notifRows = followers.map((f) => ({
    user_id: f.follower_user_id,
    type: kind,
    title: "New open house",
    body: `An open house was scheduled at ${openHouse.properties!.address_line_1}, ${openHouse.properties!.city}.`,
    entity_type: "open_house",
    entity_id: openHouseId,
  }));
  await admin.from("notifications").insert(notifRows);
}

async function notifyOfCancelledOpenHouse(openHouseId: string) {
  const admin = createAdminClient();
  const env = getServerEnv();

  const { data: openHouse } = await admin
    .from("open_houses")
    .select("seller_id, properties(address_line_1, city, slug)")
    .eq("id", openHouseId)
    .maybeSingle();
  if (!openHouse?.properties) return;

  const { data: rsvps } = await admin
    .from("open_house_rsvps")
    .select("email, first_name")
    .eq("open_house_id", openHouseId)
    .eq("status", "confirmed");

  for (const rsvp of rsvps ?? []) {
    await sendTrackedEmail({
      emailType: "open_house_cancelled",
      recipient: rsvp.email,
      props: {
        previewText: "This open house has been cancelled",
        heading: "Open house cancelled",
        intro: `The open house at ${openHouse.properties.address_line_1}, ${openHouse.properties.city} has been cancelled.`,
        ctaLabel: "View property",
        ctaUrl: `${env.NEXT_PUBLIC_SITE_URL}/homes/${openHouse.properties.slug}`,
      },
    });
  }

  const { data: notifiedFollowers } = await admin
    .from("notifications")
    .select("user_id")
    .eq("entity_id", openHouseId)
    .eq("type", "open_house_created");

  if (notifiedFollowers?.length) {
    await admin.from("notifications").insert(
      notifiedFollowers.map((f) => ({
        user_id: f.user_id,
        type: "open_house_cancelled" as const,
        title: "Open house cancelled",
        body: `The open house at ${openHouse.properties!.address_line_1}, ${openHouse.properties!.city} was cancelled.`,
        entity_type: "open_house",
        entity_id: openHouseId,
      })),
    );
  }
}
