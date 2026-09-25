import "server-only";
import { getServerEnv } from "@/config/env";

/**
 * Turnstile sits behind configuration. When
 * TURNSTILE_SECRET_KEY is unset (local dev, or before it's provisioned),
 * verification is skipped — logged once per call so it's never silently
 * mistaken for "verification passed".
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const env = getServerEnv();
  if (!env.TURNSTILE_SECRET_KEY) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY unset — skipping bot verification (dev fallback)");
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification request failed", err);
    // Fail closed: a broken verification call should not silently let a
    // bot-protection-configured deployment accept unverified submissions.
    return false;
  }
}
