import type { AccountState } from "@/lib/seller-routing";

export type NavLink = { href: string; label: string };

/**
 * Single source of truth for site navigation. Both navbar variants — the
 * landing page's floating pill and the full-width block used everywhere else —
 * render these, so destinations can never drift between routes.
 *
 * Coming Soon is intentionally absent from navigation: the /coming-soon route,
 * the status=coming_soon filter and Coming Soon listings all still exist.
 */
export const mainNavLinks: NavLink[] = [
  { href: "/homes", label: "Homes" },
  { href: "/open-houses", label: "Open Houses" },
  { href: "/sellers", label: "Sellers" },
];

// The "How it works" section only renders for guests, so its anchor does too.
const guestNavLinks: NavLink[] = [...mainNavLinks, { href: "/#how-it-works", label: "How it works" }];

export function navLinksFor(state: AccountState): NavLink[] {
  return state === "guest" ? guestNavLinks : mainNavLinks;
}

/** Compact account shortcuts shown to signed-in users on both variants. */
export const accountNavItems = [
  { href: "/account/saved", label: "Saved Listings" },
  { href: "/account/notifications", label: "Notifications" },
] as const;
