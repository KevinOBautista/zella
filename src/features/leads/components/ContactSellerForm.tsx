"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitInquiryAction } from "@/features/leads/actions";
import { HoneypotField } from "@/components/shared/HoneypotField";
import { useTurnstile } from "@/lib/turnstile/useTurnstile";

type SellerProperty = { id: string; label: string };

type Props = {
  sellerId: string;
  /** Fixed when contacting from a specific property page; omit for a profile-level contact. */
  fixedPropertyId?: string;
  hasOpenHouse?: boolean;
  sellerProperties?: SellerProperty[];
  isLoggedIn: boolean;
  prefill?: { firstName?: string; lastName?: string; email?: string; phone?: string };
};

const formSchema = z
  .object({
    profileReason: z.enum(["specific_property", "future_property", "general"]).optional(),
    selectedPropertyId: z.string().optional(),
    inquiryType: z.enum([
      "question",
      "showing_request",
      "more_information",
      "offer_interest",
      "open_house_question",
      "other",
    ]),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Enter a valid email"),
    phone: z.string().trim().optional(),
    preferredContactMethod: z.enum(["email", "phone", "text"]),
    agentStatus: z.enum(["yes", "no", "prefer_not_to_say"]),
    buyingStage: z.enum([
      "pre_approved",
      "planning_to_get_pre_approved",
      "cash_buyer",
      "just_starting",
      "prefer_not_to_say",
    ]),
    message: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.preferredContactMethod === "email" || Boolean(d.phone), {
    message: "Phone number is required for your preferred contact method",
    path: ["phone"],
  });

type FormValues = z.infer<typeof formSchema>;

export function ContactSellerForm({
  sellerId,
  fixedPropertyId,
  hasOpenHouse,
  sellerProperties = [],
  isLoggedIn,
  prefill,
}: Props) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [result, setResult] = useState<"idle" | "sent">("idle");
  const [honeypot, setHoneypot] = useState("");
  const { token: turnstileToken, widget: turnstileWidget } = useTurnstile();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profileReason: fixedPropertyId ? undefined : "general",
      inquiryType: "question",
      preferredContactMethod: "email",
      agentStatus: "prefer_not_to_say",
      buyingStage: "prefer_not_to_say",
      firstName: prefill?.firstName ?? "",
      lastName: prefill?.lastName ?? "",
      email: prefill?.email ?? "",
      phone: prefill?.phone ?? "",
    },
  });

  const preferredContact = useWatch({ control, name: "preferredContactMethod" });
  const profileReason = useWatch({ control, name: "profileReason" });

  if (result === "sent") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-accent-soft)] p-6 text-center">
        <p className="font-medium text-[var(--color-accent)]">Your inquiry was sent.</p>
        <p className="mt-1 text-sm text-[var(--color-foreground)]">
          The seller will reach out to you using the contact information you provided.
        </p>
        {!isLoggedIn && (
          <Link href="/signup" className="mt-4 inline-block text-sm font-medium text-[var(--color-accent)] underline">
            Create an account to save this property and follow the seller
          </Link>
        )}
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    let propertyId: string | null = fixedPropertyId ?? null;
    let inquiryType: string = values.inquiryType;

    if (!fixedPropertyId) {
      if (values.profileReason === "specific_property") {
        propertyId = values.selectedPropertyId ?? null;
        inquiryType = "question";
      } else if (values.profileReason === "future_property") {
        inquiryType = "future_property_interest";
      } else {
        inquiryType = "general_seller_question";
      }
    }

    const result = await submitInquiryAction({
      sellerId,
      propertyId,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || null,
      preferredContactMethod: values.preferredContactMethod,
      inquiryType,
      buyingStage: values.buyingStage,
      agentStatus: values.agentStatus,
      message: values.message || null,
      idempotencyKey,
      honeypot,
      turnstileToken,
    });

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setResult("sent");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <HoneypotField value={honeypot} onChange={setHoneypot} />
      {!fixedPropertyId && (
        <div>
          <Label htmlFor="profileReason">What are you interested in?</Label>
          <select
            id="profileReason"
            {...register("profileReason")}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
          >
            <option value="specific_property">One of their current properties</option>
            <option value="future_property">Future or Coming Soon properties</option>
            <option value="general">A general question</option>
          </select>
        </div>
      )}

      {!fixedPropertyId && profileReason === "specific_property" && (
        <div>
          <Label htmlFor="selectedPropertyId">Which property?</Label>
          <select
            id="selectedPropertyId"
            {...register("selectedPropertyId")}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
          >
            {sellerProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {fixedPropertyId && (
        <div>
          <Label htmlFor="inquiryType">What are you interested in?</Label>
          <select
            id="inquiryType"
            {...register("inquiryType")}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
          >
            <option value="question">I have a question</option>
            <option value="showing_request">Schedule a showing</option>
            <option value="more_information">I want more information</option>
            <option value="offer_interest">I&apos;m interested in making an offer</option>
            {hasOpenHouse && <option value="open_house_question">I have a question about the open house</option>}
            <option value="other">Other</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" {...register("firstName")} />
          <FieldError id="firstName-error" message={errors.firstName?.message} />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" {...register("lastName")} />
          <FieldError id="lastName-error" message={errors.lastName?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div>
        <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
        <select
          id="preferredContactMethod"
          {...register("preferredContactMethod")}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="text">Text</option>
        </select>
      </div>

      {preferredContact !== "email" && (
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" {...register("phone")} />
          <FieldError id="phone-error" message={errors.phone?.message} />
        </div>
      )}

      <div>
        <Label htmlFor="agentStatus">Are you currently working with a real estate agent?</Label>
        <select
          id="agentStatus"
          {...register("agentStatus")}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>

      <div>
        <Label htmlFor="buyingStage">Where are you in the buying process?</Label>
        <select
          id="buyingStage"
          {...register("buyingStage")}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm"
        >
          <option value="pre_approved">Pre-approved</option>
          <option value="planning_to_get_pre_approved">Planning to get pre-approved</option>
          <option value="cash_buyer">Cash buyer</option>
          <option value="just_starting">Just starting</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={4} {...register("message")} />
      </div>

      {turnstileWidget}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Send Inquiry
      </Button>
    </form>
  );
}
