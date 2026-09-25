"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const priceRanges = [
  { value: "", label: "Any price" },
  { value: "0-250000", label: "Under $250k" },
  { value: "250000-400000", label: "$250k – $400k" },
  { value: "400000-600000", label: "$400k – $600k" },
  { value: "600000-", label: "$600k+" },
];

const propertyTypes = [
  { value: "", label: "Any type" },
  { value: "single_family", label: "Single family" },
  { value: "multi_family", label: "Multi-family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "land", label: "Land" },
];

const fieldClass =
  "h-12 w-full rounded-[12px] border border-[var(--color-border)] bg-white px-3.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:border-[var(--color-foreground)] focus-visible:outline-none";

/** Routes to the existing /homes search page with its supported query params. */
export function HeroSearch() {
  const router = useRouter();

  return (
    <form
      role="search"
      aria-label="Search homes"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        const q = String(data.get("q") ?? "").trim();
        if (q) params.set("q", q);
        const [min, max] = String(data.get("price") ?? "").split("-");
        if (min) params.set("minPrice", min);
        if (max) params.set("maxPrice", max);
        const type = String(data.get("propertyType") ?? "");
        if (type) params.set("propertyType", type);
        const qs = params.toString();
        router.push(`/homes${qs ? `?${qs}` : ""}`);
      }}
      className="grid gap-2 rounded-[20px] bg-white/95 p-2 shadow-lg backdrop-blur sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]"
    >
      <label className="sr-only" htmlFor="hero-q">
        City, neighborhood, or ZIP
      </label>
      <input id="hero-q" name="q" placeholder="City, neighborhood, or ZIP" className={fieldClass} />

      <label className="sr-only" htmlFor="hero-price">
        Price range
      </label>
      <select id="hero-price" name="price" defaultValue="" className={fieldClass}>
        {priceRanges.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="hero-type">
        Property type
      </label>
      <select id="hero-type" name="propertyType" defaultValue="" className={fieldClass}>
        {propertyTypes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-foreground)] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:col-span-2 lg:col-span-1"
      >
        <Search size={16} aria-hidden="true" />
        Search
      </button>
    </form>
  );
}
