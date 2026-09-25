import Link from "next/link";
import type { Metadata } from "next";
import { getAdminReports } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Admin: Reports" };

const STATUSES = ["all", "open", "reviewing", "resolved", "dismissed"];

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const reports = await getAdminReports(status);

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Reports</h1>
      <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/reports?status=${s}`}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium capitalize ${
              status === s ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--color-muted)]"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {reports.length ? (
        <div className="space-y-2">
          {reports.map((r) => (
            <Link key={r.id} href={`/admin/reports/${r.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium capitalize">{r.reason.replace(/_/g, " ")}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {r.properties?.title ?? r.seller_profiles?.display_name ?? "Unknown target"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={r.status === "open" ? "warning" : r.status === "resolved" ? "soft" : "neutral"}>{r.status}</Badge>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No open reports." />
      )}
    </div>
  );
}
