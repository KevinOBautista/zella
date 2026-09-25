"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search } from "lucide-react";
import { buildSellersHref, type SellersSearch } from "@/features/sellers/search-params";
import { fieldClass } from "@/features/properties/components/explore/field";

/**
 * The /sellers search bar, styled like ExploreSearchPanel on /homes: same
 * rounded shell, field height, and submit button. Text lives in local state
 * and is only applied (pushed to the URL) on submit, so the URL always
 * reflects the query results were fetched for.
 */
export function SellersSearchPanel({ initial }: { initial: SellersSearch }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(initial.q ?? "");

  return (
    <form
      role="search"
      aria-label="Search sellers"
      action="/sellers"
      method="get"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        router.push(buildSellersHref(initial, { q: q.trim() || undefined }));
      }}
      className="rounded-[20px] border border-[var(--color-border)] bg-white/95 p-2 shadow-lg backdrop-blur"
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-q`} className="sr-only">
            Search by display name or @username
          </label>
          <input
            id={`${id}-q`}
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or @username"
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <button
          type="submit"
          className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-foreground)] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Search size={16} aria-hidden="true" />
          Search
        </button>
      </div>
    </form>
  );
}
