"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { step4Schema, type Step4Values } from "@/features/properties/wizard-schemas";
import { useWizardStep } from "./useWizardStep";
import type { Tables } from "@/types/database";

export function Step4Price({ propertyId, property }: { propertyId: string; property: Tables<"properties"> }) {
  const { save, pending } = useWizardStep(propertyId, 4);
  const isComingSoon = (property.target_listing_status ?? property.listing_status) === "coming_soon";
  const {
    register,
    handleSubmit,
    control,
  } = useForm<Step4Values>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      // Only Coming Soon listings may pick a pricing type; everything else is an asking price.
      pricingType: isComingSoon ? property.pricing_type : "asking_price",
      askingPriceCents: property.asking_price_cents ? property.asking_price_cents / 100 : undefined,
      expectedPriceMinCents: property.expected_price_min_cents ? property.expected_price_min_cents / 100 : undefined,
      expectedPriceMaxCents: property.expected_price_max_cents ? property.expected_price_max_cents / 100 : undefined,
    },
  });

  const pricingType = useWatch({ control, name: "pricingType" });

  const onSubmit = (data: Step4Values) =>
    save({
      pricingType: data.pricingType,
      askingPriceCents: data.askingPriceCents ? Math.round(data.askingPriceCents * 100) : undefined,
      expectedPriceMinCents: data.expectedPriceMinCents ? Math.round(data.expectedPriceMinCents * 100) : undefined,
      expectedPriceMaxCents: data.expectedPriceMaxCents ? Math.round(data.expectedPriceMaxCents * 100) : undefined,
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-6">
      {isComingSoon ? (
        <div>
          <Label htmlFor="pricingType">Pricing</Label>
          <select id="pricingType" {...register("pricingType")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
            <option value="asking_price">Exact Expected Price</option>
            <option value="expected_range">Expected Price Range</option>
            <option value="price_undecided">Price Not Decided</option>
          </select>
        </div>
      ) : (
        <input type="hidden" {...register("pricingType")} />
      )}

      {pricingType === "asking_price" && (
        <div>
          <Label htmlFor="askingPriceCents">{isComingSoon ? "Expected Price ($)" : "Asking Price ($)"}</Label>
          <Input id="askingPriceCents" type="number" min={0} step="1" {...register("askingPriceCents")} />
        </div>
      )}
      {pricingType === "expected_range" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expectedPriceMinCents">Minimum ($)</Label>
            <Input id="expectedPriceMinCents" type="number" min={0} {...register("expectedPriceMinCents")} />
          </div>
          <div>
            <Label htmlFor="expectedPriceMaxCents">Maximum ($)</Label>
            <Input id="expectedPriceMaxCents" type="number" min={0} {...register("expectedPriceMaxCents")} />
          </div>
        </div>
      )}

      <Button type="submit" loading={pending}>
        Continue
      </Button>
    </form>
  );
}
