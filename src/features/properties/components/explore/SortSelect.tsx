"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { buildHomesHref, SORT_LABELS, SORTS, type HomesSearch, type SortOption } from "@/features/properties/search-params";

export function SortSelect({ search }: { search: HomesSearch }) {
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-[var(--color-muted)]">
        Sort by
      </label>
      <select
        id={id}
        value={search.sort}
        onChange={(e) => router.push(buildHomesHref(search, { sort: e.target.value as SortOption }))}
        className="h-10 rounded-full border border-[var(--color-border)] bg-white pl-3.5 pr-8 text-sm font-medium text-[var(--color-foreground)] focus-visible:border-[var(--color-foreground)] focus-visible:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
