import type { AddressVisibility, PropertyStatus } from "@/features/properties/domain";

export type FieldError = { field: string; message: string };

/** End must be after start, and the event cannot begin in the past. */
export function validateOpenHouseWindow(input: {
  startsAt: Date;
  endsAt: Date;
  now: Date;
}): FieldError[] {
  const errors: FieldError[] = [];
  if (input.startsAt.getTime() < input.now.getTime()) {
    errors.push({ field: "startsAt", message: "The open house cannot begin in the past" });
  }
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    errors.push({ field: "endsAt", message: "End time must be after start time" });
  }
  return errors;
}

// Statuses a property must be in to host a new open house — draft (not yet
// public), sold, paused, and archived are all excluded.
const SCHEDULABLE_STATUSES: readonly PropertyStatus[] = ["for_sale", "coming_soon", "under_contract"];

export function canScheduleOpenHouse(property: {
  addressVisibility: AddressVisibility;
  listingStatus: PropertyStatus;
}): { ok: true } | { ok: false; reason: string } {
  if (property.addressVisibility !== "full") {
    return {
      ok: false,
      reason: "The property's address must be set to fully public before scheduling an open house.",
    };
  }
  if (!SCHEDULABLE_STATUSES.includes(property.listingStatus)) {
    return {
      ok: false,
      reason: "Open houses can only be scheduled for a published, active listing.",
    };
  }
  return { ok: true };
}

export type OpenHouseDerivedState = "upcoming" | "past" | "cancelled";

export function deriveOpenHouseState(
  event: { status: "scheduled" | "cancelled"; endsAt: Date },
  now: Date,
): OpenHouseDerivedState {
  if (event.status === "cancelled") return "cancelled";
  return event.endsAt.getTime() > now.getTime() ? "upcoming" : "past";
}
