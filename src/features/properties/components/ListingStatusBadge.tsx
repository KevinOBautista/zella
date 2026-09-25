import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/types/database";

const LABELS: Partial<Record<Enums<"property_status">, string>> = {
  for_sale: "FOR SALE",
  coming_soon: "COMING SOON",
  under_contract: "UNDER CONTRACT",
  sold: "SOLD",
  // Inventory-only statuses. They never appear on a public card, but the
  // seller's own grid must be able to label a draft or an archived listing.
  draft: "DRAFT",
  paused: "PAUSED",
  archived: "ARCHIVED",
};

// Monochrome except Sold, which stays red. Every status also carries an
// explicit text label above, so status is never conveyed by color alone.
const VARIANTS: Partial<Record<Enums<"property_status">, "accent" | "soft" | "danger" | "neutral">> = {
  for_sale: "accent",
  coming_soon: "soft",
  under_contract: "neutral",
  sold: "danger",
  draft: "neutral",
  paused: "neutral",
  archived: "neutral",
};

export function ListingStatusBadge({ status }: { status: Enums<"property_status"> | null }) {
  if (!status || !LABELS[status]) return null;
  return <Badge variant={VARIANTS[status] ?? "neutral"}>{LABELS[status]}</Badge>;
}
