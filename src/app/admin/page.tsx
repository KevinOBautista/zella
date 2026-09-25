import type { Metadata } from "next";
import { getAdminOverview } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active Sellers" value={overview.activeSellers} />
        <Stat label="Published Properties" value={overview.publishedProperties} />
        <Stat label="Open Reports" value={overview.openReports} />
        <Stat label="Suspended Accounts" value={overview.suspendedSellers} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
    </Card>
  );
}
