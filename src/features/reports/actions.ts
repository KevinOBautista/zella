"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportSchema } from "@/features/reports/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { limits } from "@/config/limits";
import { isHoneypotTriggered } from "@/lib/anti-spam/honeypot";
import { verifyTurnstile } from "@/lib/turnstile/verify";

export async function submitReportAction(rawInput: unknown): Promise<{ success: true } | { error: string }> {
  const parsed = reportSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your input." };
  }
  const input = parsed.data;

  const extra = rawInput as { honeypot?: string; turnstileToken?: string };
  if (isHoneypotTriggered(extra.honeypot)) {
    return { success: true };
  }
  if (!(await verifyTurnstile(extra.turnstileToken ?? null))) {
    return { error: "We couldn't verify your submission. Please try again." };
  }

  const allowed = await checkRateLimit(["report", input.propertyId ?? input.sellerId ?? "unknown"], limits.rateLimit.report);
  if (!allowed) {
    return { error: "Too many reports submitted. Please try again later." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("reports")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing) return { success: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await admin.from("reports").insert({
    property_id: input.propertyId,
    seller_id: input.sellerId,
    reporter_user_id: user?.id ?? null,
    reporter_email: user?.email ?? input.reporterEmail ?? null,
    reason: input.reason,
    description: input.description || null,
    idempotency_key: input.idempotencyKey,
  });

  if (error) return { error: "Something went wrong submitting your report." };
  return { success: true };
}
