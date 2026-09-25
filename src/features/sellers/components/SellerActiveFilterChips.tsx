import Link from "next/link";
import { X } from "lucide-react";
import { buildSellersHref, sellerFilterChips, type SellersSearch } from "@/features/sellers/search-params";

export function SellerActiveFilterChips({ search }: { search: SellersSearch }) {
  const chips = sellerFilterChips(search);
  if (chips.length === 0) return null;
  const clearHref = buildSellersHref({ page: 1 });
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] py-1.5 pl-3.5 pr-2.5 text-sm font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
        >
          {chip.label}
          <X size={14} aria-hidden="true" />
        </Link>
      ))}
      <Link href={clearHref} className="ml-1 text-sm font-medium text-[var(--color-muted)] underline-offset-4 hover:underline">
        Clear all
      </Link>
    </div>
  );
}
