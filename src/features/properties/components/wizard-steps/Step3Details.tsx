"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { step3Schema, type Step3Values } from "@/features/properties/wizard-schemas";
import { useWizardStep } from "./useWizardStep";
import type { Tables } from "@/types/database";

export function Step3Details({ propertyId, property }: { propertyId: string; property: Tables<"properties"> }) {
  const { save, pending } = useWizardStep(propertyId, 3);
  const { register, handleSubmit } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      bedrooms: property.bedrooms ?? undefined,
      fullBathrooms: property.full_bathrooms ?? undefined,
      halfBathrooms: property.half_bathrooms ?? undefined,
      squareFeet: property.square_feet ?? undefined,
      lotSize: property.lot_size ?? undefined,
      lotSizeUnit: property.lot_size_unit ?? "sqft",
      yearBuilt: property.year_built ?? undefined,
      stories: property.stories ?? undefined,
      parkingSpaces: property.parking_spaces ?? undefined,
      garageSpaces: property.garage_spaces ?? undefined,
      basementType: property.basement_type ?? "",
      heatingType: property.heating_type ?? "",
      coolingType: property.cooling_type ?? "",
      parkingType: property.parking_type ?? "",
      propertyTaxesAnnualCents: property.property_taxes_annual_cents ?? undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => save(data))} className="max-w-xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Bedrooms" id="bedrooms" register={register("bedrooms")} />
        <Field label="Full Bathrooms" id="fullBathrooms" register={register("fullBathrooms")} />
        <Field label="Half Bathrooms" id="halfBathrooms" register={register("halfBathrooms")} />
        <Field label="Interior Square Feet" id="squareFeet" register={register("squareFeet")} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Lot Size" id="lotSize" register={register("lotSize")} />
        <div>
          <Label htmlFor="lotSizeUnit">Lot Unit</Label>
          <select id="lotSizeUnit" {...register("lotSizeUnit")} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
            <option value="sqft">Sq Ft</option>
            <option value="acres">Acres</option>
          </select>
        </div>
        <Field label="Year Built" id="yearBuilt" register={register("yearBuilt")} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Stories" id="stories" register={register("stories")} />
        <Field label="Parking Spaces" id="parkingSpaces" register={register("parkingSpaces")} />
        <Field label="Garage Spaces" id="garageSpaces" register={register("garageSpaces")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basementType">Basement</Label>
          <Input id="basementType" placeholder="e.g. Finished, Unfinished, None" {...register("basementType")} />
        </div>
        <div>
          <Label htmlFor="heatingType">Heating</Label>
          <Input id="heatingType" placeholder="e.g. Forced air, Radiant" {...register("heatingType")} />
        </div>
        <div>
          <Label htmlFor="coolingType">Cooling</Label>
          <Input id="coolingType" placeholder="e.g. Central air, Window units" {...register("coolingType")} />
        </div>
        <div>
          <Label htmlFor="parkingType">Parking Type</Label>
          <Input id="parkingType" placeholder="e.g. Attached garage, Driveway" {...register("parkingType")} />
        </div>
      </div>

      <Field label="Annual Property Taxes ($)" id="propertyTaxesAnnualCents" register={register("propertyTaxesAnnualCents")} />

      <Button type="submit" loading={pending}>
        Continue
      </Button>
    </form>
  );
}

function Field({ label, id, register }: { label: string; id: string; register: ReturnType<ReturnType<typeof useForm>["register"]> }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} {...register} />
    </div>
  );
}
