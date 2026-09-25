import Link from "next/link";
import type { Metadata } from "next";
import { searchAdminProperties } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PropertyModerationActions } from "@/features/admin/components/PropertyModerationActions";
import { DemoBadge } from "@/features/demo/components/DemoBadge";

export const metadata: Metadata = { title: "Admin: Properties" };

export default async function AdminPropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const properties = await searchAdminProperties(q);

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Properties</h1>
      <form method="get" className="mb-6">
        <input name="q" defaultValue={q} placeholder="Search by title or address" className="h-10 w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm" />
      </form>
      <div className="space-y-2">
        {properties.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{p.title || p.address_line_1}</p>
              <p className="text-sm text-[var(--color-muted)]">
                {p.city}, {p.state} · @{p.seller_profiles?.username}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {p.is_demo && <DemoBadge />}
              <Badge variant="neutral">{p.listing_status}</Badge>
              <Badge variant={p.moderation_status === "hidden" ? "danger" : p.moderation_status === "flagged" ? "warning" : "soft"}>
                {p.moderation_status}
              </Badge>
              {p.is_demo ? (
                <span className="text-xs text-[var(--color-muted)]">Managed by the demo seed</span>
              ) : (
                <>
                  <Link href={`/dashboard/properties/${p.id}`} className="text-sm text-[var(--color-accent)] hover:underline">
                    View
                  </Link>
                  <PropertyModerationActions propertyId={p.id} moderationStatus={p.moderation_status} />
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
