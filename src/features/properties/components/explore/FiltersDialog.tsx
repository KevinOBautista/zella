"use client";

import { useId, useRef, useState } from "react";
import { NativeDialog } from "@/components/ui/native-dialog";
import { FieldError, Label } from "@/components/ui/label";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES_FOR_SEARCH, validateSearchForm, type SearchFormErrors } from "@/features/properties/search-params";
import { fieldClass, pillPrimaryClass, pillSecondaryClass } from "./field";

export type FiltersDraft = {
  minPrice: string;
  maxPrice: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  minSqft: string;
  status: string;
};

const COUNT_OPTIONS = [1, 2, 3, 4, 5];

/**
 * "More filters" (desktop: bathrooms, square feet, status) or the full
 * filter set (mobile). Edits a local draft; Apply hands the draft back to
 * the search panel, which validates and navigates.
 */
export function FiltersDialog({
  variant,
  draft: initialDraft,
  onClose,
  onApply,
  statusOptions,
}: {
  variant: "more" | "all";
  draft: FiltersDraft;
  onClose: () => void;
  onApply: (draft: FiltersDraft) => void;
  statusOptions: { value: string; label: string }[];
}) {
  const id = useId();
  const firstRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [draft, setDraft] = useState<FiltersDraft>(initialDraft);
  const [errors, setErrors] = useState<SearchFormErrors>({});

  function set<K extends keyof FiltersDraft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors({});
  }

  function apply() {
    const { fieldErrors } = validateSearchForm({ minPrice: draft.minPrice, maxPrice: draft.maxPrice });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    onApply(draft);
  }

  function reset() {
    setDraft({ minPrice: "", maxPrice: "", propertyType: "", bedrooms: "", bathrooms: "", minSqft: "", status: "" });
    setErrors({});
  }

  const showAll = variant === "all";

  return (
    <NativeDialog open onClose={onClose} title={showAll ? "Filters" : "More filters"} initialFocusRef={firstRef}>
      <div className="space-y-4">
        {showAll && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`${id}-min`}>Min price</Label>
                <input
                  ref={firstRef as React.RefObject<HTMLInputElement>}
                  id={`${id}-min`}
                  inputMode="numeric"
                  value={draft.minPrice}
                  onChange={(e) => set("minPrice", e.target.value)}
                  placeholder="No min"
                  aria-invalid={errors.minPrice ? true : undefined}
                  aria-describedby={errors.minPrice ? `${id}-min-error` : undefined}
                  className={fieldClass}
                />
                <FieldError id={`${id}-min-error`} message={errors.minPrice} />
              </div>
              <div>
                <Label htmlFor={`${id}-max`}>Max price</Label>
                <input
                  id={`${id}-max`}
                  inputMode="numeric"
                  value={draft.maxPrice}
                  onChange={(e) => set("maxPrice", e.target.value)}
                  placeholder="No max"
                  aria-invalid={errors.maxPrice ? true : undefined}
                  aria-describedby={errors.maxPrice ? `${id}-max-error` : undefined}
                  className={fieldClass}
                />
                <FieldError id={`${id}-max-error`} message={errors.maxPrice} />
              </div>
            </div>
            <div>
              <Label htmlFor={`${id}-type`}>Property type</Label>
              <select id={`${id}-type`} value={draft.propertyType} onChange={(e) => set("propertyType", e.target.value)} className={fieldClass}>
                <option value="">Any type</option>
                {PROPERTY_TYPES_FOR_SEARCH.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={`${id}-beds`}>Bedrooms</Label>
              <select id={`${id}-beds`} value={draft.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className={fieldClass}>
                <option value="">Any</option>
                {COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <Label htmlFor={`${id}-baths`}>Bathrooms</Label>
          <select
            ref={showAll ? undefined : (firstRef as React.RefObject<HTMLSelectElement>)}
            id={`${id}-baths`}
            value={draft.bathrooms}
            onChange={(e) => set("bathrooms", e.target.value)}
            className={fieldClass}
          >
            <option value="">Any</option>
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor={`${id}-sqft`}>Min square feet</Label>
          <input
            id={`${id}-sqft`}
            inputMode="numeric"
            value={draft.minSqft}
            onChange={(e) => set("minSqft", e.target.value)}
            placeholder="e.g. 1,500"
            className={fieldClass}
          />
        </div>

        <div>
          <Label htmlFor={`${id}-status`}>Listing status</Label>
          <select id={`${id}-status`} value={draft.status} onChange={(e) => set("status", e.target.value)} className={fieldClass}>
            <option value="">For sale, coming soon and sold</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button type="button" onClick={reset} className="text-sm font-medium text-[var(--color-muted)] underline-offset-4 hover:underline">
            Reset
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={pillSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={apply} className={pillPrimaryClass}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
}
