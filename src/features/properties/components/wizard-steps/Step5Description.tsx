"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { step5Schema, type Step5Values } from "@/features/properties/wizard-schemas";
import { limits } from "@/config/limits";
import { useWizardStep } from "./useWizardStep";
import type { Tables } from "@/types/database";

type Feature = Pick<Tables<"features">, "id" | "name" | "category">;

const CATEGORY_LABELS: Record<string, string> = { interior: "Interior", exterior: "Exterior", other: "Other" };

export function Step5Description({
  propertyId,
  property,
  allFeatures,
  selectedFeatureIds,
  customFeatures: initialCustomFeatures,
}: {
  propertyId: string;
  property: Tables<"properties">;
  allFeatures: Feature[];
  selectedFeatureIds: string[];
  customFeatures: string[];
}) {
  const { save, pending } = useWizardStep(propertyId, 5);
  const [customFeatureInput, setCustomFeatureInput] = useState("");

  const { register, handleSubmit, control, formState: { errors } } = useForm<Step5Values>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      title: property.title ?? "",
      description: property.description ?? "",
      videoUrl: property.video_url ?? "",
      virtualTourUrl: property.virtual_tour_url ?? "",
      featureIds: selectedFeatureIds,
      customFeatures: initialCustomFeatures,
    },
  });

  const description = useWatch({ control, name: "description" }) ?? "";
  const grouped = groupBy(allFeatures, (f) => f.category);

  return (
    <form onSubmit={handleSubmit((data) => save(data))} className="max-w-xl space-y-6">
      <div>
        <Label htmlFor="title">Listing Title</Label>
        <Input id="title" maxLength={limits.property.maxTitleChars} {...register("title")} />
        <FieldError id="title-error" message={errors.title?.message} />
      </div>

      <div>
        <Label htmlFor="description">Property Description</Label>
        <Textarea id="description" rows={8} maxLength={limits.property.maxDescriptionChars} {...register("description")} />
        <p className="mt-1 text-right text-xs text-[var(--color-muted-foreground)]">
          {description.length} / {limits.property.maxDescriptionChars}
        </p>
      </div>

      <Controller
        control={control}
        name="featureIds"
        render={({ field }) => (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, features]) => (
              <div key={category}>
                <p className="mb-2 text-sm font-medium">{CATEGORY_LABELS[category] ?? category}</p>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => {
                    const checked = field.value.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => field.onChange(checked ? field.value.filter((id) => id !== f.id) : [...field.value, f.id])}
                        className={`rounded-full border px-3 py-1.5 text-sm ${checked ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      />

      <Controller
        control={control}
        name="customFeatures"
        render={({ field }) => (
          <div>
            <Label htmlFor="customFeature">Add a custom feature</Label>
            <div className="flex gap-2">
              <Input
                id="customFeature"
                value={customFeatureInput}
                onChange={(e) => setCustomFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (customFeatureInput.trim()) {
                      field.onChange([...field.value, customFeatureInput.trim()]);
                      setCustomFeatureInput("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (customFeatureInput.trim()) {
                    field.onChange([...field.value, customFeatureInput.trim()]);
                    setCustomFeatureInput("");
                  }
                }}
              >
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {field.value.map((name, i) => (
                <span key={`${name}-${i}`} className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-sm">
                  {name}
                  <button type="button" onClick={() => field.onChange(field.value.filter((_, idx) => idx !== i))} aria-label={`Remove ${name}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      />

      <div>
        <Label htmlFor="videoUrl">Video URL (optional — YouTube or Vimeo)</Label>
        <Input id="videoUrl" {...register("videoUrl")} />
      </div>
      <div>
        <Label htmlFor="virtualTourUrl">Virtual Tour URL (optional)</Label>
        <Input id="virtualTourUrl" {...register("virtualTourUrl")} />
      </div>

      <Button type="submit" loading={pending}>
        Continue
      </Button>
    </form>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}
