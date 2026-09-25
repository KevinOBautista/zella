import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth/session";
import { getOwnOpenHouseById } from "@/features/open-houses/queries";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CancelOpenHouseButton } from "@/features/open-houses/components/CancelOpenHouseButton";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Manage Open House" };

export default async function ManageOpenHousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  const result = await getOwnOpenHouseById(id);
  if (!result || result.openHouse.seller_id !== seller.id) notFound();

  const { openHouse, rsvps } = result;
  const activeRsvps = rsvps.filter((r) => r.status === "confirmed");
  const totalGuests = activeRsvps.reduce((sum, r) => sum + r.party_size, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{openHouse.properties?.title ?? openHouse.properties?.address_line_1}</h1>
          <p className="text-sm text-[var(--color-muted)]">{formatOpenHouseDateTime(openHouse.starts_at, openHouse.ends_at)}</p>
          {openHouse.status === "cancelled" && <Badge variant="danger">Cancelled</Badge>}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/open-houses/new?propertyId=${openHouse.property_id}`} className={buttonVariants({ variant: "secondary" })}>
            Duplicate Event
          </Link>
          {openHouse.status === "scheduled" && <CancelOpenHouseButton openHouseId={openHouse.id} />}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--color-muted)]">Event Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Property</dt>
            <dd>{openHouse.properties?.address_line_1}, {openHouse.properties?.city}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Date & Time</dt>
            <dd>{formatOpenHouseDateTime(openHouse.starts_at, openHouse.ends_at)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Host</dt>
            <dd className="capitalize">{openHouse.host_type}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Registration</dt>
            <dd className="capitalize">{openHouse.registration_type}</dd>
          </div>
        </dl>
        {openHouse.instructions && (
          <div className="mt-3">
            <dt className="text-sm text-[var(--color-muted-foreground)]">Instructions</dt>
            <dd className="text-sm">{openHouse.instructions}</dd>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          RSVPs ({activeRsvps.length} · {totalGuests} guests expected)
        </h2>
        {activeRsvps.length ? (
          <div className="space-y-2">
            {activeRsvps.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">
                    {r.first_name} {r.last_name}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {r.email} {r.phone && `· ${r.phone}`}
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--color-muted)]">
                  <p>Party of {r.party_size}</p>
                  <p className="capitalize">{r.agent_status.replace(/_/g, " ")}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No RSVPs yet" />
        )}
      </div>
    </div>
  );
}
