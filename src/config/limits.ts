/**
 * Centralized numeric limits referenced by validation, rate limiting, and
 * UI copy. Keep every "magic number" from the spec here so it's changed in
 * one place.
 */
export const limits = {
  seller: {
    freeActiveListingLimit: 5,
  },
  property: {
    maxPhotos: 50,
    maxPhotoBytesBeforeProcessing: 10 * 1024 * 1024, // 10 MB
    maxDescriptionChars: 5000,
    maxTitleChars: 120,
  },
  rateLimit: {
    // { windowSeconds, max } — enforced per key by check_rate_limit() RPC.
    inquiry: { windowSeconds: 15 * 60, max: 5 }, // per IP+property
    rsvp: { windowSeconds: 60 * 60, max: 10 }, // per IP
    report: { windowSeconds: 60 * 60, max: 5 }, // per IP
  },
  openHouse: {
    defaultTimezone: "America/New_York",
  },
  lead: {
    maxNoteChars: 2000,
  },
} as const;
