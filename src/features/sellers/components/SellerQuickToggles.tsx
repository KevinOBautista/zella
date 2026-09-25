import Link from "next/link";
import { CalendarDays, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSellersHref, type SellersSearch } from "@/features/sellers/search-params";

function Toggle({ href, pressed, children }: { href: string; pressed: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        pressed
          ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white"
          : "border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-background)]",
      )}
    >
      {children}
    </Link>
  );
}

/** The two seller filters, styled like /homes' QuickToggles. */
export function SellerQuickToggles({ search }: { search: SellersSearch }) {
  const hasHomes = search.hasHomes === true;
  const hasOpenHouses = search.hasOpenHouses === true;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Quick filters">
      <Toggle href={buildSellersHref(search, { hasHomes: hasHomes ? undefined : true })} pressed={hasHomes}>
        <Home size={15} aria-hidden="true" />
        Has homes for sale
      </Toggle>
      <Toggle href={buildSellersHref(search, { hasOpenHouses: hasOpenHouses ? undefined : true })} pressed={hasOpenHouses}>
        <CalendarDays size={15} aria-hidden="true" />
        Has upcoming open houses
      </Toggle>
    </div>
  );
}
