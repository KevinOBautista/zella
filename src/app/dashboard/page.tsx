import Link from "next/link";
import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { getDashboardOverview } from "@/features/dashboard/queries";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { StatusCountTiles } from "@/features/dashboard/components/StatusCountTiles";
import { LeadPipeline } from "@/features/dashboard/components/LeadPipeline";
import type { LeadCardData } from "@/features/leads/components/LeadPreviewCard";

export const metadata: Metadata = { title: "Dashboard" };

const ACTIVITY_LABELS: Record<string, string> = {
  property_published: "Published",
  status_changed: "Status changed",
  property_sold: "Marked sold",
  property_paused: "Paused",
  property_archived: "Archived",
  open_house_cancelled: "Open house cancelled",
};

const panelClass = "rounded-[20px] border border-[var(--color-border)] bg-white/95 p-5 shadow-sm";

function coverPath(images: { storage_path: string; is_cover: boolean | null; display_order: number | null }[] | null | undefined) {
  if (!images?.length) return null;
  const cover = images.find((i) => i.is_cover);
  if (cover) return cover.storage_path;
  return [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]?.storage_path ?? null;
}

export default async function DashboardHomePage() {
  const { seller } = await requireSeller();
  const { counts, leads, upcomingOpenHouses, activity } = await getDashboardOverview(seller.id);

  const leadCards: LeadCardData[] = leads.map((lead) => ({
    id: lead.id,
    first_name: lead.first_name,
    last_name: lead.last_name,
    created_at: lead.created_at,
    lead_status: lead.lead_status,
    message: lead.message,
    property_id: lead.property_id,
    property_title: lead.properties?.title ?? lead.properties?.address_line_1 ?? null,
    property_cover_path: coverPath(lead.properties?.property_images),
  }));

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Welcome back, ${seller.display_name}`}
        description="Your listings, buyer inquiries and upcoming open houses."
        action={
          <Link href="/dashboard/properties/new" className={buttonVariants()}>
            Add Property
          </Link>
        }
      />

      <StatusCountTiles counts={counts} />

      <LeadPipeline leads={leadCards} total={leadCards.length} previewLimit={3} sellerUsername={seller.username} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-light tracking-tight">Upcoming Open Houses</h2>
          <Link href="/dashboard/open-houses" className="text-sm text-[var(--color-accent)] hover:underline">
            View all
          </Link>
        </div>
        {upcomingOpenHouses.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcomingOpenHouses.map((oh) => (
              <li key={oh.id} className={panelClass}>
                <p className="font-medium">{oh.properties?.title ?? oh.properties?.address_line_1}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {formatOpenHouseDateTime(oh.starts_at, oh.ends_at)} ET
                </p>
                <Link
                  href={`/dashboard/open-houses/${oh.id}`}
                  className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            size="compact"
            title="No open houses scheduled."
            actionLabel="Schedule Open House"
            actionHref="/dashboard/open-houses/new"
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-light tracking-tight">Recent Activity</h2>
        {activity.length ? (
          <ul className={`${panelClass} divide-y divide-[var(--color-border)] py-1`}>
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
                <span>
                  {ACTIVITY_LABELS[a.event_type] ?? a.event_type} — {a.properties?.title ?? a.properties?.address_line_1}
                </span>
                <span className="text-[var(--color-muted-foreground)]">{new Date(a.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState size="compact" title="No activity yet." description="Publishing or updating a listing shows up here." />
        )}
      </section>
    </div>
  );
}
