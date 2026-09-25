"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth/session";
import { inquirySchema } from "@/features/leads/schemas";
import { isValidLeadStatusTransition, LEAD_STATUSES } from "@/features/leads/domain";
import { checkRateLimit } from "@/lib/rate-limit";
import { limits } from "@/config/limits";
import { notifySellerOfInquiry } from "@/features/leads/notify";
import { revalidatePath } from "next/cache";
import { isHoneypotTriggered } from "@/lib/anti-spam/honeypot";
import { verifyTurnstile } from "@/lib/turnstile/verify";
import { demoRejection, isDemoContentError, type DemoRejection } from "@/features/demo/constants";
import { isDemoTarget } from "@/features/demo/server";

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  question: "question",
  showing_request: "showing request",
  more_information: "request for more information",
  offer_interest: "offer inquiry",
  open_house_question: "open house question",
  future_property_interest: "future property inquiry",
  general_seller_question: "general question",
  other: "inquiry",
};

export type SubmitInquiryResult = { success: true; inquiryId: string } | { error: string } | DemoRejection;

export async function submitInquiryAction(rawInput: unknown): Promise<SubmitInquiryResult> {
  const parsed = inquirySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your information and try again." };
  }
  const input = parsed.data;

  // Demo listings and sellers never collect inquiries: reject before any
  // rate-limit hit, write or notification (the database enforces this too).
  if (await isDemoTarget({ propertyId: input.propertyId, sellerId: input.sellerId })) return demoRejection;

  // Anti-spam order: Zod, then honeypot, then
  // Turnstile, then rate limit.
  const extra = rawInput as { honeypot?: string; turnstileToken?: string };
  if (isHoneypotTriggered(extra.honeypot)) {
    // A bot filled in a field real visitors never see — report success
    // without persisting anything or revealing that it was detected.
    return { success: true, inquiryId: crypto.randomUUID() };
  }
  if (!(await verifyTurnstile(extra.turnstileToken ?? null))) {
    return { error: "We couldn't verify your submission. Please try again." };
  }

  const allowed = await checkRateLimit(
    ["inquiry", input.propertyId ?? input.sellerId],
    limits.rateLimit.inquiry,
  );
  if (!allowed) {
    return { error: "Too many inquiries submitted. Please try again in a few minutes." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("inquiries")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing) {
    return { success: true, inquiryId: existing.id };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inquiry, error } = await admin
    .from("inquiries")
    .insert({
      property_id: input.propertyId,
      seller_id: input.sellerId,
      user_id: user?.id ?? null,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      preferred_contact_method: input.preferredContactMethod,
      inquiry_type: input.inquiryType,
      buying_stage: input.buyingStage,
      agent_status: input.agentStatus,
      message: input.message,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (isDemoContentError(error)) return demoRejection;
  if (error || !inquiry) {
    return { error: "Something went wrong sending your inquiry. Please try again." };
  }

  // The inquiry is already saved — a notification/email failure
  // below must never change the result the buyer sees.
  try {
    await notifySellerOfInquiry({
      inquiryId: inquiry.id,
      sellerId: input.sellerId,
      propertyId: input.propertyId,
      buyerName: `${input.firstName} ${input.lastName}`,
      inquiryTypeLabel: INQUIRY_TYPE_LABELS[input.inquiryType] ?? "inquiry",
    });
  } catch (err) {
    console.error("notifySellerOfInquiry failed", err);
  }

  return { success: true, inquiryId: inquiry.id };
}

// ---- Seller CRM actions -----------------------------------------------------

export async function updateLeadStatusAction(inquiryId: string, newStatus: string) {
  const { seller, isSuspended } = await requireSeller();
  if (isSuspended) return { error: "Your account is suspended." };
  if (!LEAD_STATUSES.includes(newStatus as (typeof LEAD_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  const supabase = await createClient();
  const { data: current } = await supabase.from("inquiries").select("lead_status, seller_id").eq("id", inquiryId).maybeSingle();
  if (!current || current.seller_id !== seller.id) return { error: "Lead not found" };
  if (!isValidLeadStatusTransition(current.lead_status, newStatus as (typeof LEAD_STATUSES)[number])) {
    return { success: true } as const; // no-op transition (same status)
  }

  const { error } = await supabase.rpc("update_lead_status", {
    p_inquiry_id: inquiryId,
    p_new_status: newStatus as (typeof LEAD_STATUSES)[number],
  });
  if (error) return { error: "Could not update lead status" };
  revalidatePath(`/dashboard/leads/${inquiryId}`);
  revalidatePath("/dashboard/leads");
  return { success: true } as const;
}

export async function addLeadNoteAction(inquiryId: string, note: string) {
  await requireSeller();
  if (!note.trim()) return { error: "Note cannot be empty" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_lead_note", { p_inquiry_id: inquiryId, p_note: note.trim() });
  if (error) return { error: "Could not add note" };
  revalidatePath(`/dashboard/leads/${inquiryId}`);
  return { success: true } as const;
}
