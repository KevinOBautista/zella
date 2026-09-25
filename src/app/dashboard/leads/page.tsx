import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/lib/auth/session";
import { getLeads, getOwnSellerProperties } from "@/features/leads/queries";
import { parseLeadsSearchParams, LEADS_PATH } from "@/features/leads/search-params";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LeadFilters } from "@/features/leads/components/LeadFilters";
import { LeadBoard } from "@/features/leads/components/LeadBoard";
import { LeadPreviewCard, type LeadCardData } from "@/features/leads/components/LeadPreviewCard";

export const metadata: Metadata = { title: "Leads" };

type RawSearchParams = Record<string, string | string[] | undefined>;

type LeadRow = Awaited<ReturnType<typeof getLeads>>["leads"][number];

function coverPath(images: { storage_path: string; is_cover: boolean | null; display_order: number | null }[] | null | undefined) {
  if (!images?.length) return null;
  const cover = images.find((i) => i.is_cover);
  if (cover) return cover.storage_path;
  return [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]?.storage_path ?? null;
}

function toCardData(lead: LeadRow): LeadCardData {
  return {
    id: lead.id,
    first_name: lead.first_name,
    last_name: lead.last_name,
    created_at: lead.created_at,
    lead_status: lead.lead_status,
    message: lead.message,
    property_id: lead.property_id,
    property_title: lead.properties?.title ?? lead.properties?.address_line_1 ?? null,
    property_cover_path: coverPath(lead.properties?.property_images),
  };
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const { seller } = await requireSeller();
  const search = parseLeadsSearchParams(await searchParams);

  const [{ leads, countsByStatus, total }, properties] = await Promise.all([
    getLeads(seller.id, { status: search.status, propertyId: search.property, q: search.q, sort: search.sort }),
    getOwnSellerProperties(seller.id),
  ]);

  const cards = leads.map(toCardData);
  // "No inquiries at all" is a different message from "nothing matches
  // these filters" — total counts every status, closed included.
  const noInquiriesAtAll = total === 0 && !search.q && !search.property;

  return (
    <div className="space-y-8">
      <PageHeader title="Leads" description="Buyer inquiries across all of your properties." />

      {noInquiriesAtAll ? (
        <EmptyState
          title="No buyer inquiries yet."
          description="Inquiries from your public listings and seller profile land here."
          actionLabel="View Public Profile"
          actionHref={`/@${seller.username}`}
        />
      ) : (
        <>
          <LeadFilters search={search} counts={countsByStatus} total={total} properties={properties} />

          {cards.length === 0 ? (
            <EmptyState
              size="compact"
              title="No leads match these filters."
              description="Every category, including closed leads, is available when filters are cleared."
              actionLabel="Clear filters"
              actionHref={LEADS_PATH}
            />
          ) : search.view === "board" ? (
            <>
              {/* The board needs horizontal room; below md the same leads
                  render as one vertical list driven by the status select. */}
              <div className="hidden md:block">
                <LeadBoard
                  leads={cards}
                  propertyId={search.property}
                  statuses={search.status === "all" ? undefined : [search.status]}
                />
              </div>
              <div className="md:hidden">
                <LeadList cards={cards} />
              </div>
            </>
          ) : (
            <LeadList cards={cards} />
          )}

          {search.property && (
            <p className="text-sm text-[var(--color-muted)]">
              Filtered to one property.{" "}
              <Link href={LEADS_PATH} className="text-[var(--color-accent)] hover:underline">
                Show all leads
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LeadList({ cards }: { cards: LeadCardData[] }) {
  return (
    <ul className="space-y-2">
      {cards.map((lead) => (
        <li key={lead.id}>
          <LeadPreviewCard lead={lead} showMoveMenu />
        </li>
      ))}
    </ul>
  );
}
