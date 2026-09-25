"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { step2Schema, type Step2Values } from "@/features/properties/wizard-schemas";
import { useWizardStep } from "./useWizardStep";
import type { Tables } from "@/types/database";

export function Step2SaleStatus({
  propertyId,
  property,
  agent,
}: {
  propertyId: string;
  property: Tables<"properties">;
  agent: Tables<"property_agents"> | null;
}) {
  const { save, pending } = useWizardStep(propertyId, 2);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      // Published listings change status from the property page; the action ignores this field for them.
      listingStatus:
        property.target_listing_status === "for_sale" || property.target_listing_status === "coming_soon"
          ? property.target_listing_status
          : "draft",
      addressVisibility: property.address_visibility,
      saleMethod: property.sale_method,
      leadRecipient: property.lead_recipient,
      agentName: agent?.name ?? "",
      agentBrokerage: agent?.brokerage ?? "",
      agentEmail: agent?.email ?? "",
      agentPhone: agent?.phone ?? "",
    },
  });

  const listingStatus = useWatch({ control, name: "listingStatus" });
  const isPublished = property.published_at !== null;
  const saleMethod = useWatch({ control, name: "saleMethod" });

  return (
    <form
      onSubmit={handleSubmit((data) =>
        save({
          ...data,
          addressVisibility: listingStatus === "coming_soon" && data.addressVisibility === "full" ? data.addressVisibility : data.addressVisibility,
        }),
      )}
      className="max-w-xl space-y-6"
    >
      {isPublished ? (
        <div>
          <input type="hidden" {...register("listingStatus")} />
          <p className="text-sm text-[var(--color-muted)]">
            This listing is live. Change its status (pause, under contract, sold) from the property page.
          </p>
        </div>
      ) : (
        <div>
          <Label htmlFor="listingStatus">How would you like to list this property?</Label>
          <select id="listingStatus" {...register("listingStatus")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
            <option value="for_sale">For Sale</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="draft">Draft Only (save for later)</option>
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="addressVisibility">Address visibility</Label>
        <select id="addressVisibility" {...register("addressVisibility")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          <option value="full">Full address</option>
          <option value="city_zip">City and ZIP only</option>
          <option value="city_only">City only</option>
        </select>
        <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
          Open houses can only be scheduled once this is set to &quot;Full address.&quot;
        </p>
      </div>

      <div>
        <Label htmlFor="saleMethod">How are you selling this property?</Label>
        <select id="saleMethod" {...register("saleMethod")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          <option value="independent">Independent</option>
          <option value="agent_assisted">Working with a real estate agent or broker</option>
        </select>
      </div>

      {saleMethod === "agent_assisted" && (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <div>
            <Label htmlFor="agentName">Agent Name</Label>
            <Input id="agentName" {...register("agentName")} />
          </div>
          <div>
            <Label htmlFor="agentBrokerage">Brokerage</Label>
            <Input id="agentBrokerage" {...register("agentBrokerage")} />
          </div>
          <div>
            <Label htmlFor="agentEmail">Agent Email</Label>
            <Input id="agentEmail" type="email" {...register("agentEmail")} />
            <FieldError id="agentEmail-error" message={errors.agentEmail?.message} />
          </div>
          <div>
            <Label htmlFor="agentPhone">Agent Phone</Label>
            <Input id="agentPhone" type="tel" {...register("agentPhone")} />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="leadRecipient">Who should receive buyer inquiries?</Label>
        <select id="leadRecipient" {...register("leadRecipient")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          <option value="seller">Me</option>
          {saleMethod === "agent_assisted" && <option value="agent">My Agent</option>}
          {saleMethod === "agent_assisted" && <option value="both">Both</option>}
        </select>
        <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
          You&apos;ll always be able to see every lead in your dashboard regardless of this setting.
        </p>
      </div>

      <Button type="submit" loading={pending}>
        Continue
      </Button>
    </form>
  );
}
