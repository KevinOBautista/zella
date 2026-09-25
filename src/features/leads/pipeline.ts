import { LEAD_STATUSES, type LeadStatus } from "@/features/leads/domain";

/**
 * Restrained badge variants for the pipeline. Every column also carries its
 * text label and count, so status is never conveyed by color alone.
 */
export const LEAD_STATUS_TONE: Record<LeadStatus, "accent" | "soft" | "neutral" | "warning"> = {
  new: "accent",
  contacted: "soft",
  showing_scheduled: "soft",
  interested: "soft",
  offer_stage: "warning",
  closed: "neutral",
  not_interested: "neutral",
};

/** Categories that are kept collapsed by default — label and count stay visible. */
export const COLLAPSED_BY_DEFAULT: readonly LeadStatus[] = ["closed", "not_interested"];

export type LeadStatusGroup<T> = {
  status: LeadStatus;
  /** Total leads in this category across the whole matching dataset. */
  count: number;
  /** At most `previewLimit` leads, for preview surfaces. */
  leads: T[];
  hasMore: boolean;
};

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

/**
 * Groups leads into every existing status, in pipeline order. Categories
 * with no leads are still returned so the seller can see each label and a
 * zero count — moving a lead changes which group it lands in, it never
 * removes it from view.
 */
export function groupLeadsByStatus<T extends { lead_status: string }>(
  leads: readonly T[],
  previewLimit = Number.POSITIVE_INFINITY,
): LeadStatusGroup<T>[] {
  const buckets = new Map<LeadStatus, T[]>(LEAD_STATUSES.map((s) => [s, []]));
  for (const lead of leads) {
    if (!isLeadStatus(lead.lead_status)) continue;
    buckets.get(lead.lead_status)!.push(lead);
  }
  return LEAD_STATUSES.map((status) => {
    const all = buckets.get(status)!;
    return {
      status,
      count: all.length,
      leads: Number.isFinite(previewLimit) ? all.slice(0, previewLimit) : all,
      hasMore: Number.isFinite(previewLimit) && all.length > previewLimit,
    };
  });
}

/** Zero-filled count per status — safe to index for any status label. */
export function countLeadsByStatus(rows: readonly { lead_status: string }[]): Record<LeadStatus, number> {
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const row of rows) {
    if (isLeadStatus(row.lead_status)) counts[row.lead_status] += 1;
  }
  return counts;
}
