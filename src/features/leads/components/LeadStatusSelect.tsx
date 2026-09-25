"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/features/leads/domain";
import { updateLeadStatusAction } from "@/features/leads/actions";

export function LeadStatusSelect({ inquiryId, status }: { inquiryId: string; status: LeadStatus }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        setValue(next);
        startTransition(async () => {
          const result = await updateLeadStatusAction(inquiryId, next);
          if (result && "error" in result) {
            toast.error(result.error);
            setValue(status);
          } else {
            toast.success("Lead status updated");
            router.refresh();
          }
        });
      }}
      className="h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
