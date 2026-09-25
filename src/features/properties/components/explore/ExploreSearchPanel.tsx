"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { FieldError } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  buildHomesHref,
  parsePriceInput,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES_FOR_SEARCH,
  SEARCH_STATUSES,
  STATUS_LABELS,
  validateSearchForm,
  type HomesSearch,
  type HomesSearchPatch,
  type SearchFormErrors,
} from "@/features/properties/search-params";
import { FiltersDialog, type FiltersDraft } from "./FiltersDialog";
import { fieldClass, pillSecondaryClass } from "./field";

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

export type PanelValues = FiltersDraft & { q: string };

function seed(initial: HomesSearch): PanelValues {
  return {
    q: initial.q ?? "",
    minPrice: initial.minPrice != null ? String(initial.minPrice) : "",
    maxPrice: initial.maxPrice != null ? String(initial.maxPrice) : "",
    propertyType: initial.propertyType ?? "",
    bedrooms: initial.bedrooms != null ? String(initial.bedrooms) : "",
    bathrooms: initial.bathrooms != null ? String(initial.bathrooms) : "",
    minSqft: initial.minSqft != null ? String(initial.minSqft) : "",
    status: initial.status ?? "",
  };
}

function toPatch(v: PanelValues): HomesSearchPatch {
  const min = parsePriceInput(v.minPrice);
  const max = parsePriceInput(v.maxPrice);
  const sqft = v.minSqft.trim() ? Number(v.minSqft.replace(/[,\s]/g, "")) : undefined;
  return {
    q: v.q.trim() || undefined,
    minPrice: typeof min === "number" ? min : undefined,
    maxPrice: typeof max === "number" ? max : undefined,
    propertyType: (v.propertyType || undefined) as HomesSearch["propertyType"],
    bedrooms: v.bedrooms ? Number(v.bedrooms) : undefined,
    bathrooms: v.bathrooms ? Number(v.bathrooms) : undefined,
    minSqft: sqft && Number.isFinite(sqft) ? sqft : undefined,
    status: (v.status || undefined) as HomesSearch["status"],
  };
}

/**
 * The Explore search panel. Typed values live in local state and are only
 * applied (pushed to the URL) on Search / Apply, so the URL always reflects
 * the query the results were fetched for. The page remounts this component
 * (via `key`) whenever the applied search changes.
 */
export function ExploreSearchPanel({ initial }: { initial: HomesSearch }) {
  const router = useRouter();
  const id = useId();
  const [values, setValues] = useState<PanelValues>(() => seed(initial));
  const [errors, setErrors] = useState<SearchFormErrors>({});
  const [dialog, setDialog] = useState<"more" | "all" | null>(null);

  const advancedCount = [values.bathrooms, values.minSqft, values.status].filter(Boolean).length;

  function set<K extends keyof PanelValues>(key: K, value: PanelValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (key === "minPrice" || key === "maxPrice") setErrors({});
  }

  function apply(next: PanelValues): boolean {
    const { fieldErrors } = validateSearchForm({ minPrice: next.minPrice, maxPrice: next.maxPrice });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return false;
    setValues(next);
    router.push(buildHomesHref(initial, toPatch(next)));
    return true;
  }

  return (
    <>
      <form
        id="explore-search"
        role="search"
        aria-label="Search homes"
        action="/homes"
        method="get"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          apply(values);
        }}
        className="rounded-[20px] border border-[var(--color-border)] bg-white/95 p-2 shadow-lg backdrop-blur"
      >
        {initial.sort !== "newest" && <input type="hidden" name="sort" value={initial.sort} />}
        {/* Advanced filters travel as hidden inputs so a no-JS submit keeps them. */}
        {values.bathrooms && <input type="hidden" name="bathrooms" value={values.bathrooms} />}
        {values.minSqft && <input type="hidden" name="minSqft" value={values.minSqft} />}
        {values.status && <input type="hidden" name="status" value={values.status} />}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_auto_auto]">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`${id}-q`} className="sr-only">
                Location: city, neighborhood, or ZIP
              </label>
              <input
                id={`${id}-q`}
                name="q"
                value={values.q}
                onChange={(e) => set("q", e.target.value)}
                placeholder="City, neighborhood, or ZIP"
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setDialog("all")}
              className={cn(pillSecondaryClass, "h-12 shrink-0 rounded-[12px] px-3.5 sm:hidden")}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters
            </button>
          </div>

          <div className="hidden sm:block">
            <label htmlFor={`${id}-min`} className="sr-only">
              Min price
            </label>
            <input
              id={`${id}-min`}
              name="minPrice"
              inputMode="numeric"
              value={values.minPrice}
              onChange={(e) => set("minPrice", e.target.value)}
              placeholder="Min price"
              aria-invalid={errors.minPrice ? true : undefined}
              aria-describedby={errors.minPrice ? `${id}-min-error` : undefined}
              className={fieldClass}
            />
          </div>

          <div className="hidden sm:block">
            <label htmlFor={`${id}-max`} className="sr-only">
              Max price
            </label>
            <input
              id={`${id}-max`}
              name="maxPrice"
              inputMode="numeric"
              value={values.maxPrice}
              onChange={(e) => set("maxPrice", e.target.value)}
              placeholder="Max price"
              aria-invalid={errors.maxPrice ? true : undefined}
              aria-describedby={errors.maxPrice ? `${id}-max-error` : undefined}
              className={fieldClass}
            />
          </div>

          <div className="hidden sm:block">
            <label htmlFor={`${id}-type`} className="sr-only">
              Property type
            </label>
            <select id={`${id}-type`} name="propertyType" value={values.propertyType} onChange={(e) => set("propertyType", e.target.value)} className={fieldClass}>
              <option value="">Any type</option>
              {PROPERTY_TYPES_FOR_SEARCH.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block">
            <label htmlFor={`${id}-beds`} className="sr-only">
              Bedrooms
            </label>
            <select id={`${id}-beds`} name="bedrooms" value={values.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className={fieldClass}>
              <option value="">Any beds</option>
              {BEDROOM_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}+ beds
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setDialog("more")}
            aria-haspopup="dialog"
            className={cn(pillSecondaryClass, "hidden h-12 rounded-[12px] px-4 sm:inline-flex")}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            More filters
            {advancedCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-foreground)] px-1.5 text-xs font-semibold text-white">
                <span className="sr-only">, </span>
                {advancedCount}
                <span className="sr-only"> applied</span>
              </span>
            )}
          </button>

          <button
            type="submit"
            className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-foreground)] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:col-span-2 lg:col-span-1"
          >
            <Search size={16} aria-hidden="true" />
            Search
          </button>
        </div>

        {(errors.minPrice || errors.maxPrice) && (
          <div className="px-2 pb-1">
            <FieldError id={`${id}-min-error`} message={errors.minPrice} />
            <FieldError id={`${id}-max-error`} message={errors.maxPrice} />
          </div>
        )}
      </form>

      {dialog && (
        <FiltersDialog
          variant={dialog}
          draft={values}
          onClose={() => setDialog(null)}
          onApply={(draft) => {
            if (apply({ ...values, ...draft })) setDialog(null);
          }}
          statusOptions={SEARCH_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />
      )}
    </>
  );
}
