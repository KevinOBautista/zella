"use client";

import { useState } from "react";
import Link from "next/link";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/features/leads/domain";
import { groupLeadsByStatus, LEAD_STATUS_TONE } from "@/features/leads/pipeline";
import { buildLeadsHref } from "@/features/leads/search-params";
import { LeadPreviewCard, type LeadCardData } from "./LeadPreviewCard";

const TONE_DOT: Record<string, string> = {
  accent: "bg-[var(--color-accent)]",
  soft: "bg-[var(--color-muted-foreground)]",
  warning: "bg-[var(--color-warning)]",
  neutral: "bg-[var(--color-border)]",
};

/**
 * Categorized buyer-inquiry board. With no status filter applied every
 * existing status gets a column — closed and not-interested included — so
 * moving a lead re-files it rather than hiding it. When the page is
 * filtered to one status, only that column renders, so the board reflects
 * the applied filter instead of showing six empty categories beside it.
 */
export function LeadBoard({
  leads,
  propertyId,
  statuses,
}: {
  leads: LeadCardData[];
  propertyId?: string;
  /** The applied status filter. Omit to show every category. */
  statuses?: readonly LeadStatus[];
}) {
  const [rows, setRows] = useState(leads);
  const allGroups = groupLeadsByStatus(rows);
  const groups = statuses?.length ? allGroups.filter((g) => statuses.includes(g.status)) : allGroups;

  function onMoved(id: string, status: LeadStatus) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, lead_status: status } : row)));
  }

  return (
    // A wrapping grid rather than a horizontal scroller: seven fixed-width
    // columns cannot fit beside the sidebar, and pushing categories off the
    // right edge hides them behind a scrollbar.
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((group) => (
        <section
          key={group.status}
          aria-label={`${LEAD_STATUS_LABELS[group.status]} (${group.count})`}
          className="flex min-w-0 flex-col rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 shadow-sm"
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${TONE_DOT[LEAD_STATUS_TONE[group.status]] ?? TONE_DOT.neutral}`} />
            <span className="truncate">{LEAD_STATUS_LABELS[group.status]}</span>
            <span className="ml-auto text-[var(--color-muted)]">{group.count}</span>
          </h3>
          {group.leads.length ? (
            <ul className="flex flex-col gap-2">
              {group.leads.map((lead) => (
                <li key={lead.id}>
                  <LeadPreviewCard lead={lead} showMoveMenu onMoved={(status) => onMoved(lead.id, status)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-sm text-[var(--color-muted)]">
              No leads in this category.
            </p>
          )}
          {group.count > group.leads.length && (
            <Link
              href={buildLeadsHref({ status: group.status, property: propertyId })}
              className="mt-2 text-sm text-[var(--color-accent)] hover:underline"
            >
              View all {group.count}
            </Link>
          )}
        </section>
      ))}
    </div>
  );
}
