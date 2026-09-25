import Link from "next/link";

export type PropertyStatusCounts = {
  for_sale: number;
  coming_soon: number;
  under_contract: number;
  drafts: number;
  sold: number;
};

// Tab keys match the TABS in /dashboard/properties, so each tile opens the
// matching filtered view.
const TILES: { key: keyof PropertyStatusCounts; label: string }[] = [
  { key: "for_sale", label: "For Sale" },
  { key: "coming_soon", label: "Coming Soon" },
  { key: "under_contract", label: "Under Contract" },
  { key: "sold", label: "Sold" },
  { key: "drafts", label: "Drafts" },
];

/** Inventory counts by listing status. Counts only — no analytics. */
export function StatusCountTiles({ counts }: { counts: PropertyStatusCounts }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map((tile) => (
        <li key={tile.key}>
          <Link
            href={`/dashboard/properties?tab=${tile.key}`}
            className="flex h-full flex-col justify-between rounded-[20px] border border-[var(--color-border)] bg-white/95 px-4 py-3.5 shadow-sm transition-colors hover:border-[var(--color-muted-foreground)]"
          >
            <span className="text-2xl font-light">{counts[tile.key]}</span>
            <span className="mt-1 text-sm text-[var(--color-muted)]">{tile.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
