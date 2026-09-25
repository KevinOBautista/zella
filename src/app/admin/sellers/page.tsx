import type { Metadata } from "next";
import { searchAdminSellers } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SellerAdminActions } from "@/features/admin/components/SellerAdminActions";
import { DemoBadge } from "@/features/demo/components/DemoBadge";

export const metadata: Metadata = { title: "Admin: Sellers" };

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const sellers = await searchAdminSellers(q);

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Sellers</h1>
      <form method="get" className="mb-6">
        <input name="q" defaultValue={q} placeholder="Search by name or username" className="h-10 w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm" />
      </form>
      <div className="space-y-2">
        {sellers.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{s.display_name}</p>
              <p className="text-sm text-[var(--color-muted)]">
                @{s.username} · {s.account_type} · {s.activePropertyCount} active · {s.reportCount} reports
              </p>
            </div>
            <div className="flex items-center gap-3">
              {s.is_demo && <DemoBadge />}
              <Badge variant={s.status === "active" ? "soft" : "danger"}>{s.status}</Badge>
              {s.is_demo ? (
                <span className="text-xs text-[var(--color-muted)]">Managed by the demo seed</span>
              ) : (
                <SellerAdminActions sellerId={s.id} status={s.status} additionalSlots={s.additionalListingSlots} />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
