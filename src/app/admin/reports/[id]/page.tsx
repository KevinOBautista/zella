import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminReportById } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportResolveForm } from "@/features/admin/components/ReportResolveForm";

export const metadata: Metadata = { title: "Report Detail" };

export default async function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getAdminReportById(id);
  if (!report) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl capitalize">{report.reason.replace(/_/g, " ")}</h1>
        <Badge variant={report.status === "open" ? "warning" : "soft"}>{report.status}</Badge>
      </div>

      <Card className="p-5">
        <dl className="space-y-2 text-sm">
          {report.properties && (
            <div>
              <dt className="text-[var(--color-muted-foreground)]">Property</dt>
              <dd>
                <Link href={`/homes/${report.properties.slug}`} target="_blank" className="underline">
                  {report.properties.title ?? report.properties.address_line_1}
                </Link>
              </dd>
            </div>
          )}
          {report.seller_profiles && (
            <div>
              <dt className="text-[var(--color-muted-foreground)]">Seller</dt>
              <dd>
                <Link href={`/@${report.seller_profiles.username}`} target="_blank" className="underline">
                  {report.seller_profiles.display_name}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Reporter</dt>
            <dd>{report.reporter_email ?? "Anonymous"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Description</dt>
            <dd className="whitespace-pre-line">{report.description ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Submitted</dt>
            <dd>{new Date(report.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--color-muted)]">Resolution</h2>
        <ReportResolveForm reportId={report.id} defaultNote={report.admin_resolution_note} />
      </Card>
    </div>
  );
}
