export const PROPERTY_STATUSES = [
  "draft",
  "coming_soon",
  "for_sale",
  "under_contract",
  "sold",
  "paused",
  "archived",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** Statuses that count against the seller's active-listing entitlement. */
export const ACTIVE_LISTING_STATUSES: readonly PropertyStatus[] = [
  "coming_soon",
  "for_sale",
  "under_contract",
];

export function countsTowardActiveLimit(status: PropertyStatus): boolean {
  return ACTIVE_LISTING_STATUSES.includes(status);
}

/**
 * Status state machine. `paused` can return to any active status because
 * the row that recorded which active status it was paused from lives in
 * the database (properties.paused_from_status), not in this pure check —
 * this function only answers "is the edge structurally legal at all".
 */
const TRANSITIONS: Record<PropertyStatus, readonly PropertyStatus[]> = {
  draft: ["coming_soon", "for_sale"],
  coming_soon: ["for_sale", "paused", "archived"],
  for_sale: ["under_contract", "sold", "paused", "archived"],
  under_contract: ["for_sale", "sold", "paused", "archived"],
  paused: ["coming_soon", "for_sale", "under_contract", "archived"],
  sold: ["archived"],
  archived: [],
};

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type AddressVisibility = "full" | "city_zip" | "city_only";

export type AddressRecord = {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

export type PublicAddress = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  displayLine: string;
};

/**
 * The single place hidden address data gets redacted before crossing to a
 * public DTO. The hidden value must never reach the
 * browser — not sent-then-hidden with CSS, never sent at all.
 */
export function toPublicAddress(record: AddressRecord & { addressVisibility: AddressVisibility }): PublicAddress {
  const { addressVisibility, city, state } = record;

  if (addressVisibility === "full") {
    return {
      addressLine1: record.addressLine1,
      addressLine2: record.addressLine2,
      city,
      state,
      postalCode: record.postalCode,
      latitude: record.latitude,
      longitude: record.longitude,
      displayLine: `${record.addressLine1}, ${city}, ${state} ${record.postalCode}`,
    };
  }

  if (addressVisibility === "city_zip") {
    return {
      addressLine1: null,
      addressLine2: null,
      city,
      state,
      postalCode: record.postalCode,
      latitude: null,
      longitude: null,
      displayLine: `${city}, ${state} ${record.postalCode}`,
    };
  }

  return {
    addressLine1: null,
    addressLine2: null,
    city,
    state,
    postalCode: null,
    latitude: null,
    longitude: null,
    displayLine: `${city}, ${state}`,
  };
}

export type PricingType = "asking_price" | "expected_range" | "price_undecided";

export type PropertyDraftSnapshot = {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  propertyType: string;
  listingStatus: PropertyStatus;
  pricingType: PricingType;
  askingPriceCents: number | null;
  expectedPriceMinCents: number | null;
  expectedPriceMaxCents: number | null;
  photoCount: number;
  publishAcknowledged: boolean;
};

export type FieldError = { field: string; message: string };

/**
 * Server-side publication gate: never rely on a disabled
 * frontend button alone. Every rule here is re-checked by the `publish_property`
 * Postgres RPC before it flips the row's status.
 */
export function canPublish(
  draft: PropertyDraftSnapshot,
): { ok: true } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];

  for (const [field, value] of [
    ["addressLine1", draft.addressLine1],
    ["city", draft.city],
    ["state", draft.state],
    ["postalCode", draft.postalCode],
  ] as const) {
    if (!value || value.trim().length === 0) {
      errors.push({ field, message: `${field} is required` });
    }
  }

  if (draft.photoCount < 1) {
    errors.push({ field: "photos", message: "At least one photo is required before publishing" });
  }

  if (!draft.publishAcknowledged) {
    errors.push({
      field: "publishAcknowledged",
      message: "You must confirm you are authorized to advertise this property",
    });
  }

  if (draft.pricingType === "asking_price") {
    if (draft.askingPriceCents === null || draft.askingPriceCents <= 0) {
      errors.push({ field: "askingPriceCents", message: "Asking price is required" });
    }
  } else if (draft.pricingType === "expected_range") {
    if (draft.expectedPriceMinCents === null) {
      errors.push({ field: "expectedPriceMinCents", message: "Minimum expected price is required" });
    }
    if (draft.expectedPriceMaxCents === null) {
      errors.push({ field: "expectedPriceMaxCents", message: "Maximum expected price is required" });
    }
    if (
      draft.expectedPriceMinCents !== null &&
      draft.expectedPriceMaxCents !== null &&
      draft.expectedPriceMinCents > draft.expectedPriceMaxCents
    ) {
      errors.push({
        field: "expectedPriceMaxCents",
        message: "Maximum expected price must be greater than the minimum",
      });
    }
  }
  // price_undecided: no price fields required.

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
