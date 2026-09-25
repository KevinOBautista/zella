import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildHomesHref, type HomesSearch } from "@/features/properties/search-params";

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

/** One-click filters for the two listing moments people ask about most. */
export function QuickToggles({ search }: { search: HomesSearch }) {
  const comingSoon = search.status === "coming_soon";
  const openHouse = search.openHouse === true;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Quick filters">
      <Toggle href={buildHomesHref(search, { status: comingSoon ? undefined : "coming_soon" })} pressed={comingSoon}>
        <Sparkles size={15} aria-hidden="true" />
        Coming soon
      </Toggle>
      <Toggle href={buildHomesHref(search, { openHouse: openHouse ? undefined : true })} pressed={openHouse}>
        <CalendarDays size={15} aria-hidden="true" />
        Upcoming open houses
      </Toggle>
    </div>
  );
}
