import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Any signed-in user, verified or not. Redirects to /login otherwise; pass
 * `next` so the intended destination survives the sign-in round trip.
 */
export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * Authenticated product features (saves, follows, the dashboard,
 * account pages) require a verified email. Guests can still browse,
 * inquire, and RSVP without ever hitting this check.
 */
export async function requireVerifiedUser(next?: string) {
  const user = await requireUser(next);
  if (!user.email_confirmed_at) redirect("/verify-email");
  return user;
}

export async function getSellerProfile(userId: string): Promise<Tables<"seller_profiles"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/**
 * Loads the caller's seller profile. Redirects to seller onboarding if
 * they don't have one. `isSuspended` lets pages render a suspension
 * banner instead of a silent redirect.
 */
export async function requireSeller() {
  const user = await requireVerifiedUser();
  const seller = await getSellerProfile(user.id);
  if (!seller) redirect("/onboarding/seller-type");
  return { user, seller, isSuspended: seller.status === "suspended" };
}

export const SERVICE_UNAVAILABLE_MESSAGE = "The service is temporarily unavailable. Please try again.";

/**
 * requireSeller for route handlers called via fetch(): returns an error and
 * HTTP status instead of redirecting, so the client gets JSON it can show.
 * A failed Supabase call (e.g. a gateway 504) becomes a retryable 503 rather
 * than being mistaken for "signed out".
 */
export async function getSellerForApi(): Promise<
  | { user: User; seller: Tables<"seller_profiles">; isSuspended: boolean }
  | { error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    const supabaseUnavailable =
      authError && authError.name !== "AuthSessionMissingError" && (!authError.status || authError.status >= 500);
    return supabaseUnavailable
      ? { error: SERVICE_UNAVAILABLE_MESSAGE, status: 503 }
      : { error: "Your session has expired. Please sign in again.", status: 401 };
  }
  if (!user.email_confirmed_at) return { error: "Please verify your email first.", status: 403 };

  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (sellerError) return { error: SERVICE_UNAVAILABLE_MESSAGE, status: 503 };
  if (!seller) return { error: "A seller profile is required.", status: 403 };

  return { user, seller, isSuspended: seller.status === "suspended" };
}

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return Boolean(data);
}

export async function requireAdmin() {
  const user = await requireVerifiedUser();
  const admin = await checkIsAdmin();
  if (!admin) redirect("/");
  return user;
}
