/**
 * Single source of truth for account-aware seller entry points (header,
 * hero, lower promo, footer, avatar dropdown, mobile menu). Pure and
 * client-safe — no server imports.
 *
 * `AccountState` is derived once per request in `@/lib/auth/viewer` from the
 * real session + `seller_profiles` row. There is no persisted "onboarding in
 * progress" state in the schema (a seller profile either exists or it
 * doesn't), so the "Finish Seller Setup" variant has no data to key off yet.
 */
export type AccountState = "guest" | "buyer" | "seller";

export const SELLER_ONBOARDING_PATH = "/onboarding";
export const MANAGE_PROPERTIES_PATH = "/dashboard/properties";
export const ADD_PROPERTY_PATH = "/dashboard/properties/new";
export const SELLER_DASHBOARD_PATH = "/dashboard";

/** Why a guest is being asked to sign in — drives the copy on /login. */
export type AuthReason = "follow" | "save" | "sell";

export const AUTH_REASON_COPY: Record<AuthReason, string> = {
  follow: "Sign in to follow this seller.",
  save: "Sign in to save this home.",
  sell: "Sign in to list your property. New here? Create an account below.",
};

export function isAuthReason(value: unknown): value is AuthReason {
  return value === "follow" || value === "save" || value === "sell";
}

/** Only accept same-origin relative paths as post-auth destinations. */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

export function loginHref(opts: { next?: string; reason?: AuthReason } = {}): string {
  const params = new URLSearchParams();
  if (opts.next) params.set("next", opts.next);
  if (opts.reason) params.set("reason", opts.reason);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

export function signupHref(opts: { next?: string; reason?: AuthReason } = {}): string {
  const params = new URLSearchParams();
  if (opts.next) params.set("next", opts.next);
  if (opts.reason) params.set("reason", opts.reason);
  const qs = params.toString();
  return qs ? `/signup?${qs}` : "/signup";
}

export type Cta = { label: string; href: string };

/**
 * The primary seller CTA for a given account state.
 *
 * - guest  → sign-up with seller intent; `/onboarding` then checks real
 *            seller status after auth (existing sellers land on the
 *            properties dashboard, everyone else continues to setup).
 * - buyer  → `/onboarding` adds seller capabilities to the existing account.
 * - seller → the properties dashboard.
 */
export function sellerCta(state: AccountState, variant: "list" | "start" = "list"): Cta {
  switch (state) {
    case "seller":
      return { label: "Manage Properties", href: MANAGE_PROPERTIES_PATH };
    case "buyer":
      return { label: "Start Selling", href: SELLER_ONBOARDING_PATH };
    case "guest":
    default:
      return {
        label: variant === "start" ? "List Your Property" : "List a Property",
        href: signupHref({ next: SELLER_ONBOARDING_PATH, reason: "sell" }),
      };
  }
}
