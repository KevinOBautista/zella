import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/config/env";
import GenericNotificationEmail, {
  type GenericNotificationEmailProps,
} from "@/emails/GenericNotificationEmail";

export type EmailType =
  | "new_inquiry_seller"
  | "new_inquiry_agent"
  | "new_open_house_rsvp"
  | "rsvp_confirmation"
  | "open_house_announced"
  | "open_house_updated"
  | "open_house_cancelled"
  | "new_property"
  | "coming_soon_property"
  | "listing_hidden"
  | "seller_suspended";

type SendResult = { status: "sent" | "failed"; providerMessageId?: string; errorMessage?: string };

/**
 * The database write that triggered this email has already
 * committed by the time this is called. A failure here is logged to
 * email_deliveries and swallowed — it must never roll back or hide the
 * fact that (e.g.) an inquiry was successfully saved.
 */
export async function sendTrackedEmail(params: {
  emailType: EmailType;
  recipient: string;
  notificationId?: string;
  props: GenericNotificationEmailProps;
}): Promise<SendResult> {
  const admin = createAdminClient();

  const { data: deliveryRow } = await admin
    .from("email_deliveries")
    .insert({
      email_type: params.emailType,
      recipient: params.recipient,
      notification_id: params.notificationId ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  const result = await deliverEmail(params.recipient, params.props);

  if (deliveryRow) {
    await admin
      .from("email_deliveries")
      .update({
        status: result.status,
        provider_message_id: result.providerMessageId ?? null,
        error_message: result.errorMessage ?? null,
        sent_at: result.status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", deliveryRow.id);
  }

  return result;
}

async function deliverEmail(recipient: string, props: GenericNotificationEmailProps): Promise<SendResult> {
  const env = getServerEnv();

  if (!env.RESEND_API_KEY) {
    return deliverToDevTransport(recipient, props);
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: recipient,
      subject: props.heading,
      react: GenericNotificationEmail(props),
    });
    if (error) {
      return { status: "failed", errorMessage: error.message };
    }
    return { status: "sent", providerMessageId: data?.id };
  } catch (err) {
    return { status: "failed", errorMessage: err instanceof Error ? err.message : "Unknown send error" };
  }
}

/**
 * Development fallback when RESEND_API_KEY is unset: renders the email to
 * ./.dev-emails/*.html so it can be opened in a browser, and records it as
 * "sent" with a `dev:` message id so it's clearly distinguishable from a
 * real delivery in email_deliveries.
 */
async function deliverToDevTransport(recipient: string, props: GenericNotificationEmailProps): Promise<SendResult> {
  try {
    const html = await render(GenericNotificationEmail(props));
    const dir = path.join(process.cwd(), ".dev-emails");
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${recipient.replace(/[^a-z0-9]/gi, "_")}.html`;
    await writeFile(path.join(dir, filename), html, "utf-8");
    console.log(`[dev email] ${props.heading} -> ${recipient} (.dev-emails/${filename})`);
    return { status: "sent", providerMessageId: `dev:${filename}` };
  } catch (err) {
    return { status: "failed", errorMessage: err instanceof Error ? err.message : "Dev transport failed" };
  }
}
