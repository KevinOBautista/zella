import Link from "next/link";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/features/leads/domain";
import { buildLeadsHref } from "@/features/leads/search-params";

/**
 * Property-scoped inquiry counts. Every status is listed — closed leads
 * stay reachable — and each one opens the full Leads page with that status
 * and this property applied.
 */
export function LeadCountsByStatus({
  propertyId,
  counts,
}: {
  propertyId: string;
  counts: Record<LeadStatus, number>;
}) {
  const total = LEAD_STATUSES.reduce((n, s) => n + counts[s], 0);

  if (total === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No inquiries for this property yet. They appear here as buyers reach out.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-1.5">
        {LEAD_STATUSES.map((status) => (
          <li key={status}>
            <Link
              href={buildLeadsHref({ status, property: propertyId })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-background)]"
            >
              <span>{LEAD_STATUS_LABELS[status]}</span>
              <span className="text-[var(--color-muted)]">{counts[status]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={buildLeadsHref({ property: propertyId })} className="inline-block text-sm text-[var(--color-accent)] hover:underline">
        All {total} leads for this property
      </Link>
    </div>
  );
}
