"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { step1Schema, type Step1Values, PROPERTY_TYPES } from "@/features/properties/wizard-schemas";
import { useWizardStep } from "./useWizardStep";
import type { Tables } from "@/types/database";

const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  single_family: "Single Family",
  multi_family: "Multi-Family",
  condo: "Condo",
  townhouse: "Townhouse",
  co_op: "Co-op",
  land: "Land",
  manufactured_home: "Manufactured Home",
  other: "Other",
};

/** Omit propertyId/property to render the "Add Property" form, which creates the listing on submit. */
export function Step1Property({ propertyId, property }: { propertyId?: string; property?: Tables<"properties"> }) {
  const { save, pending } = useWizardStep(propertyId ?? null, 1);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      addressLine1: property?.address_line_1 ?? "",
      addressLine2: property?.address_line_2 ?? "",
      city: property?.city ?? "",
      state: property?.state ?? "",
      postalCode: property?.postal_code ?? "",
      county: property?.county ?? "",
      propertyType: property?.property_type ?? "single_family",
      numberOfUnits: property?.number_of_units ?? undefined,
      hoaFeeCents: property?.hoa_fee_cents ?? undefined,
    },
  });

  const propertyType = useWatch({ control, name: "propertyType" });

  return (
    <form onSubmit={handleSubmit((data) => save(data))} className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="addressLine1">Street Address</Label>
        <Input id="addressLine1" {...register("addressLine1")} />
        <FieldError id="addressLine1-error" message={errors.addressLine1?.message} />
      </div>
      <div>
        <Label htmlFor="addressLine2">Apartment or Unit (optional)</Label>
        <Input id="addressLine2" {...register("addressLine2")} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
          <FieldError id="city-error" message={errors.city?.message} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" maxLength={2} {...register("state")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="postalCode">ZIP Code</Label>
          <Input id="postalCode" {...register("postalCode")} />
          <FieldError id="postalCode-error" message={errors.postalCode?.message} />
        </div>
        <div>
          <Label htmlFor="county">County (optional)</Label>
          <Input id="county" {...register("county")} />
        </div>
      </div>
      <div>
        <Label htmlFor="propertyType">Property Type</Label>
        <select id="propertyType" {...register("propertyType")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {propertyType === "multi_family" && (
        <div>
          <Label htmlFor="numberOfUnits">Number of Units</Label>
          <Input id="numberOfUnits" type="number" min={2} {...register("numberOfUnits")} />
        </div>
      )}
      {(propertyType === "condo" || propertyType === "co_op") && (
        <div>
          <Label htmlFor="hoaFeeCents">Monthly HOA / Maintenance Fee ($)</Label>
          <Input id="hoaFeeCents" type="number" min={0} {...register("hoaFeeCents")} />
        </div>
      )}
      <Button type="submit" loading={pending}>
        Continue
      </Button>
    </form>
  );
}
