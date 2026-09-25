"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/features/leads/domain";
import { updateLeadStatusAction } from "@/features/leads/actions";

/**
 * Explicit "Move to" menu for a lead's pipeline status — keyboard- and
 * touch-operable, and the only interaction needed to re-categorize a lead.
 * The status is moved optimistically and rolled back if the server rejects
 * the update, so a failure never loses or duplicates the record.
 *
 * Pipeline status is independent of the property's listing status: this
 * only ever writes `inquiries.lead_status`.
 */
export function LeadMoveMenu({
  inquiryId,
  status,
  onMoved,
  className,
}: {
  inquiryId: string;
  status: LeadStatus;
  /** Lets a board move the card between columns before the refresh lands. */
  onMoved?: (status: LeadStatus) => void;
  className?: string;
}) {
  const [current, setCurrent] = useState<LeadStatus>(status);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function move(next: LeadStatus) {
    const previous = current;
    setCurrent(next);
    onMoved?.(next);
    startTransition(async () => {
      const result = await updateLeadStatusAction(inquiryId, next);
      if (result && "error" in result) {
        setCurrent(previous);
        onMoved?.(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Moved to ${LEAD_STATUS_LABELS[next]}`);
      router.refresh();
    });
  }

  return (
    <OverflowMenu
      label={pending ? "Move to (saving…)" : "Move to"}
      className={className}
      items={LEAD_STATUSES.filter((s) => s !== current).map((s) => ({
        label: LEAD_STATUS_LABELS[s],
        onSelect: () => move(s),
      }))}
    />
  );
}
