export const LEAD_STATUSES = [
  "new",
  "contacted",
  "showing_scheduled",
  "interested",
  "offer_stage",
  "closed",
  "not_interested",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  showing_scheduled: "Showing Scheduled",
  interested: "Interested",
  offer_stage: "Offer / Negotiation",
  closed: "Closed",
  not_interested: "Not Interested",
};

/**
 * Any status may move to any other status except itself — the pipeline
 * order is a suggested flow, not a locked state machine, since a
 * seller must be able to correct a mis-click.
 */
export function isValidLeadStatusTransition(from: LeadStatus, to: LeadStatus): boolean {
  return from !== to && LEAD_STATUSES.includes(to);
}

export type PreferredContactMethod = "email" | "phone" | "text";

/** Phone becomes required only when Phone or Text is selected. */
export function requiresPhone(preferredContactMethod: PreferredContactMethod): boolean {
  return preferredContactMethod === "phone" || preferredContactMethod === "text";
}
