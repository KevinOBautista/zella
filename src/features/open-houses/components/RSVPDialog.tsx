"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitRsvpAction } from "@/features/open-houses/actions";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { HoneypotField } from "@/components/shared/HoneypotField";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";
import { DEMO_COPY } from "@/features/demo/constants";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  partySize: z.coerce.number().int().min(1).max(20),
  agentStatus: z.enum(["working_with_agent", "not_working_with_agent", "prefer_not_to_say"]),
  message: z.string().trim().max(1000).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function RSVPDialog({
  openHouseId,
  startsAt,
  endsAt,
  addressLine,
  prefill,
  isDemo = false,
}: {
  openHouseId: string;
  startsAt: string;
  endsAt: string;
  addressLine: string;
  prefill?: { firstName?: string; lastName?: string; email?: string };
  /** Demo events explain instead of collecting an RSVP. */
  isDemo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [honeypot, setHoneypot] = useState("");
  const { token: turnstileToken, widget: turnstileWidget } = useTurnstile();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partySize: 1,
      agentStatus: "prefer_not_to_say",
      firstName: prefill?.firstName ?? "",
      lastName: prefill?.lastName ?? "",
      email: prefill?.email ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await submitRsvpAction({
      ...values,
      phone: values.phone || null,
      message: values.message || null,
      openHouseId,
      idempotencyKey,
      honeypot,
      turnstileToken,
    });
    if ("error" in result) return;
    setConfirmed(true);
  };

  if (isDemo) {
    return (
      <>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          RSVP
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} title={DEMO_COPY.rsvpTitle}>
          <p className="text-sm text-[var(--color-muted)]">{DEMO_COPY.rsvpBody}</p>
          <Button type="button" variant="secondary" className="mt-5 self-start" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        RSVP
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="RSVP to Open House">
        {confirmed ? (
          <div className="text-center">
            <p className="font-medium text-[var(--color-accent)]">You&apos;re registered.</p>
            <p className="mt-1 text-sm">{formatOpenHouseDateTime(startsAt, endsAt)}</p>
            <p className="text-sm text-[var(--color-muted)]">{addressLine}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            <p className="text-sm text-[var(--color-muted)]">
              {formatOpenHouseDateTime(startsAt, endsAt)} — {addressLine}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rsvp-firstName">First name</Label>
                <Input id="rsvp-firstName" {...register("firstName")} />
                <FieldError id="rsvp-firstName-error" message={errors.firstName?.message} />
              </div>
              <div>
                <Label htmlFor="rsvp-lastName">Last name</Label>
                <Input id="rsvp-lastName" {...register("lastName")} />
                <FieldError id="rsvp-lastName-error" message={errors.lastName?.message} />
              </div>
            </div>
            <div>
              <Label htmlFor="rsvp-email">Email</Label>
              <Input id="rsvp-email" type="email" {...register("email")} />
              <FieldError id="rsvp-email-error" message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="rsvp-phone">Phone (optional)</Label>
              <Input id="rsvp-phone" type="tel" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="rsvp-partySize">Party size</Label>
              <Input id="rsvp-partySize" type="number" min={1} max={20} {...register("partySize")} />
            </div>
            <div>
              <Label htmlFor="rsvp-agentStatus">Are you working with a real estate agent?</Label>
              <select
                id="rsvp-agentStatus"
                {...register("agentStatus")}
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
              >
                <option value="working_with_agent">Yes, working with an agent</option>
                <option value="not_working_with_agent">No</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <Label htmlFor="rsvp-message">Message (optional)</Label>
              <Textarea id="rsvp-message" rows={2} {...register("message")} />
            </div>
            {turnstileWidget}
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Confirm RSVP
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
