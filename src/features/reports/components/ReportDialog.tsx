"use client";

import { useMemo, useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReportAction } from "@/features/reports/actions";
import { HoneypotField } from "@/components/shared/HoneypotField";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";

const REASONS: { value: string; label: string }[] = [
  { value: "fraud", label: "Fraud" },
  { value: "incorrect_information", label: "Incorrect information" },
  { value: "discriminatory_content", label: "Discriminatory content" },
  { value: "stolen_photos", label: "Stolen photos" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export function ReportDialog({ propertyId, sellerId }: { propertyId?: string; sellerId?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fraud");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [honeypot, setHoneypot] = useState("");
  const { token: turnstileToken, widget: turnstileWidget } = useTurnstile();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        <Flag size={12} /> Report
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Report a problem">
        {submitted ? (
          <p className="text-sm text-[var(--color-muted)]">
            Thank you — our team will review this report.
          </p>
        ) : (
          <div className="space-y-4">
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            <div>
              <Label htmlFor="report-reason">Reason</Label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="report-description">Details (optional)</Label>
              <Textarea id="report-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            {turnstileWidget}
            <Button
              className="w-full"
              loading={submitting}
              onClick={async () => {
                setSubmitting(true);
                const result = await submitReportAction({
                  propertyId: propertyId ?? null,
                  sellerId: sellerId ?? null,
                  reason,
                  description,
                  idempotencyKey,
                  honeypot,
                  turnstileToken,
                });
                setSubmitting(false);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                setSubmitted(true);
              }}
            >
              Submit report
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
