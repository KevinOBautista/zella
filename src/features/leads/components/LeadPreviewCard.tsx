import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/features/leads/domain";
import { LEAD_STATUS_TONE } from "@/features/leads/pipeline";
import { LeadMoveMenu } from "./LeadMoveMenu";

export type LeadCardData = {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  lead_status: string;
  message: string | null;
  property_id: string | null;
  property_title: string | null;
  property_cover_path: string | null;
};

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Compact buyer-inquiry card. Photography stays small here on purpose —
 * large imagery belongs to property presentation, not the lead pipeline.
 * The move menu is a sibling of the link, never nested inside it.
 */
export function LeadPreviewCard({
  lead,
  showMoveMenu = false,
  onMoved,
}: {
  lead: LeadCardData;
  showMoveMenu?: boolean;
  onMoved?: (status: LeadStatus) => void;
}) {
  const status = lead.lead_status as LeadStatus;
  const thumb = propertyImageUrl(lead.property_cover_path);

  return (
    <article className="relative rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-muted-foreground)]">
      <div className="flex gap-3">
        {thumb && (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-border)]">
            <Image src={thumb} alt="" fill sizes="44px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/leads/${lead.id}`} className="block rounded-[8px]">
            <p className="truncate font-medium text-[var(--color-foreground)]">
              {lead.first_name} {lead.last_name}
            </p>
            <p className="truncate text-sm text-[var(--color-muted)]">{lead.property_title ?? "General inquiry"}</p>
            {lead.message && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{lead.message}</p>}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={LEAD_STATUS_TONE[status] ?? "neutral"}>{LEAD_STATUS_LABELS[status] ?? status}</Badge>
            <span className="text-xs text-[var(--color-muted-foreground)]">{dateFormat.format(new Date(lead.created_at))}</span>
          </div>
        </div>
        {showMoveMenu && <LeadMoveMenu inquiryId={lead.id} status={status} onMoved={onMoved} className="shrink-0" />}
      </div>
    </article>
  );
}
