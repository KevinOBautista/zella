import Link from "next/link";
import { LEAD_STATUS_LABELS } from "@/features/leads/domain";
import { COLLAPSED_BY_DEFAULT, groupLeadsByStatus, LEAD_STATUS_TONE } from "@/features/leads/pipeline";
import { buildLeadsHref, LEADS_PATH } from "@/features/leads/search-params";
import { LeadPreviewCard, type LeadCardData } from "@/features/leads/components/LeadPreviewCard";
import { EmptyState } from "@/components/shared/EmptyState";

const TONE_DOT: Record<string, string> = {
  accent: "bg-[var(--color-accent)]",
  soft: "bg-[var(--color-muted-foreground)]",
  warning: "bg-[var(--color-warning)]",
  neutral: "bg-[var(--color-border)]",
};

/**
 * Overview preview of the whole buyer-inquiry pipeline. Every existing
 * category is present with its real count, so a lead that is moved out of
 * New is re-filed here rather than disappearing. Closed and not-interested
 * start collapsed to save space, but keep their labels and counts visible.
 */
export function LeadPipeline({
  leads,
  total,
  previewLimit = 3,
  sellerUsername,
}: {
  leads: LeadCardData[];
  /** Count across every category, used only to pick the empty state. */
  total: number;
  previewLimit?: number;
  sellerUsername?: string;
}) {
  const groups = groupLeadsByStatus(leads, previewLimit);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-light tracking-tight">Lead Pipeline</h2>
        <Link href={LEADS_PATH} className="text-sm text-[var(--color-accent)] hover:underline">
          View all leads
        </Link>
      </div>

      {total === 0 ? (
        <EmptyState
          size="compact"
          title="No buyer inquiries yet."
          description="Inquiries from your listings and seller profile appear here."
          {...(sellerUsername ? { actionLabel: "View Public Profile", actionHref: `/@${sellerUsername}` } : {})}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const heading = (
              <>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${TONE_DOT[LEAD_STATUS_TONE[group.status]] ?? TONE_DOT.neutral}`} />
                <span className="truncate">{LEAD_STATUS_LABELS[group.status]}</span>
                <span className="ml-auto text-[var(--color-muted)]">{group.count}</span>
              </>
            );
            const body = (
              <>
                {group.leads.length ? (
                  <ul className="space-y-2">
                    {group.leads.map((lead) => (
                      <li key={lead.id}>
                        <LeadPreviewCard lead={lead} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
                    No leads in this category.
                  </p>
                )}
                {group.count > 0 && (
                  <Link
                    href={buildLeadsHref({ status: group.status })}
                    className="mt-3 inline-block text-sm text-[var(--color-accent)] hover:underline"
                  >
                    View all {group.count}
                  </Link>
                )}
              </>
            );
            const label = `${LEAD_STATUS_LABELS[group.status]} ${group.count}`;

            if (COLLAPSED_BY_DEFAULT.includes(group.status)) {
              return (
                <details
                  key={group.status}
                  aria-label={label}
                  className="rounded-[20px] border border-[var(--color-border)] bg-white/95 p-4 shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">{heading}</summary>
                  <div className="mt-3">{body}</div>
                </details>
              );
            }

            return (
              <section
                key={group.status}
                aria-label={label}
                className="rounded-[20px] border border-[var(--color-border)] bg-white/95 p-4 shadow-sm"
              >
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">{heading}</h3>
                {body}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
