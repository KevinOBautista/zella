/**
 * Single source of truth for the brand identity. Nothing outside this file
 * should hardcode the product name. Import `brand` instead.
 */
export const brand = {
  name: "Zella",
  shortName: "Zella",
  tagline: "Find your next home directly from local sellers.",
  description:
    "Zella is a property marketing and buyer-lead platform connecting sellers and buyers directly in Western New York.",
  supportEmail: "support@zella.example",
  launchRegion: {
    label: "Buffalo & Western New York",
    cities: [
      "Buffalo",
      "Amherst",
      "Cheektowaga",
      "Williamsville",
      "Tonawanda",
      "Hamburg",
      "Orchard Park",
      "West Seneca",
      "Lancaster",
    ],
    state: "NY",
  },
  social: {
    twitterHandle: undefined as string | undefined,
    instagramUrl: undefined as string | undefined,
  },
  legal: {
    // Bump these when Terms/Privacy/Fair Housing content changes materially;
    // profiles.terms_accepted_at is compared against this to require re-accept.
    termsVersion: "2026-09-01",
    privacyVersion: "2026-09-01",
    fairHousingVersion: "2026-09-01",
  },
} as const;

export type Brand = typeof brand;
