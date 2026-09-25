import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/config/env";
import { buttonVariants } from "@/components/ui/button";
import { PropertyActionsPanel } from "@/features/properties/components/PropertyActionsPanel";
import { PropertyManageHeader } from "@/features/properties/components/PropertyManageHeader";
import { LeadCountsByStatus } from "@/features/leads/components/LeadCountsByStatus";
import { countLeadsByStatus } from "@/features/leads/pipeline";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { formatCents } from "@/lib/money";
import { specsLabel } from "@/features/properties/components/PropertyCard";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Manage Property" };

const panelClass = "rounded-[20px] border border-[var(--color-border)] bg-white/95 p-5 shadow-sm";

function priceLine(property: {
  pricing_type: string | null;
  asking_price_cents: number | null;
  expected_price_min_cents: number | null;
  expected_price_max_cents: number | null;
  sold_price_cents: number | null;
  listing_status: string;
}): string | null {
  if (property.listing_status === "sold" && property.sold_price_cents) return formatCents(property.sold_price_cents);
  if (property.pricing_type === "expected_range" && property.expected_price_min_cents && property.expected_price_max_cents) {
    return `${formatCents(property.expected_price_min_cents)} – ${formatCents(property.expected_price_max_cents)}`;
  }
  if (property.pricing_type === "asking_price" && property.asking_price_cents) return formatCents(property.asking_price_cents);
  return null;
}

export default async function ManagePropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*, property_images(storage_path, is_cover, display_order)")
    .eq("id", id)
    .maybeSingle();
  // Ownership is enforced here, on the server, before anything renders.
  if (!property || property.seller_id !== seller.id) notFound();

  const [{ data: openHouses }, { data: leadRows }] = await Promise.all([
    supabase.from("open_houses").select("*").eq("property_id", id).order("starts_at", { ascending: false }),
    supabase.from("inquiries").select("lead_status").eq("property_id", id),
  ]);

  const images = property.property_images ?? [];
  const cover = images.find((i) => i.is_cover) ?? [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
  const env = getServerEnv();
  const publicUrl = property.slug ? `${env.NEXT_PUBLIC_SITE_URL}/homes/${property.slug}` : null;
  const addressHiddenPublicly = property.address_visibility !== "full";
  const fullAddress = property.address_line_1
    ? `${property.address_line_1}, ${property.city}, ${property.state} ${property.postal_code}`
    : null;
  const specs = specsLabel(property);
  const canScheduleOpenHouse =
    property.address_visibility === "full" && property.listing_status !== "draft" && property.listing_status !== "archived";
  const upcoming = (openHouses ?? []).find((oh) => oh.status === "scheduled" && new Date(oh.ends_at) > new Date());

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/properties" className="text-sm text-[var(--color-muted)] hover:underline">
          ← Your Properties
        </Link>
      </div>

      <PropertyManageHeader
        propertyId={id}
        title={property.title || property.address_line_1 || "Untitled draft"}
        displayLine={fullAddress}
        listingStatus={property.listing_status}
        price={priceLine(property)}
        coverImagePath={cover?.storage_path ?? null}
        addressHiddenPublicly={addressHiddenPublicly}
        publicUrl={publicUrl}
      />

      <section className={panelClass} aria-labelledby="details-heading">
        <h2 id="details-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Property Details
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Specs" value={specs ?? "Not filled in yet"} />
          <Detail label="Price" value={priceLine(property) ?? "Not set"} />
          <Detail label="Address" value={fullAddress ?? "No address yet"} />
          <Detail
            label="Public address visibility"
            value={addressHiddenPublicly ? "Hidden — city and area only" : "Shown in full"}
          />
          <Detail label="Photos" value={`${images.length} uploaded`} />
          <Detail label="Next open house" value={upcoming ? `${formatOpenHouseDateTime(upcoming.starts_at, upcoming.ends_at)} ET` : "None scheduled"} />
        </dl>
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <PropertyActionsPanel propertyId={id} status={property.listing_status} />
        </div>
      </section>

      <section className={panelClass} aria-labelledby="leads-heading">
        <h2 id="leads-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Leads
        </h2>
        <LeadCountsByStatus propertyId={id} counts={countLeadsByStatus(leadRows ?? [])} />
      </section>

      <section className={panelClass} aria-labelledby="open-houses-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="open-houses-heading" className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Open Houses
          </h2>
          {canScheduleOpenHouse && (
            <Link href={`/dashboard/open-houses/new?propertyId=${id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Schedule Open House
            </Link>
          )}
        </div>
        {openHouses?.length ? (
          <ul className="divide-y divide-[var(--color-border)]">
            {openHouses.map((oh) => (
              <li key={oh.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{formatOpenHouseDateTime(oh.starts_at, oh.ends_at)} ET</p>
                  {oh.status === "cancelled" ? (
                    <Badge variant="danger" className="mt-1">
                      Cancelled
                    </Badge>
                  ) : (
                    <p className="text-xs text-[var(--color-muted)]">Scheduled</p>
                  )}
                </div>
                <Link href={`/dashboard/open-houses/${oh.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            {canScheduleOpenHouse
              ? "No open houses scheduled."
              : "The address must be public, and the listing live, before an open house can be scheduled."}
          </p>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
