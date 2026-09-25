import type { Metadata } from "next";
import { getAuditLog } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Admin: Audit Log" };

const ACTION_LABELS: Record<string, string> = {
  seller_status_changed: "Seller status changed",
  property_moderation_changed: "Property moderation changed",
  report_status_changed: "Report status changed",
  listing_entitlement_changed: "Listing entitlement changed",
};

export default async function AdminAuditLogPage() {
  const entries = await getAuditLog();

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Audit Log</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Every consequential admin action is recorded here automatically and cannot be edited.
      </p>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{ACTION_LABELS[e.action] ?? e.action}</p>
                <span className="text-xs text-[var(--color-muted-foreground)]">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {e.entity_type} · {e.entity_id}
              </p>
              {(e.previous_value || e.new_value) && (
                <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">
                  {JSON.stringify(e.previous_value)} → {JSON.stringify(e.new_value)}
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No audit log entries yet" />
      )}
    </div>
  );
}
