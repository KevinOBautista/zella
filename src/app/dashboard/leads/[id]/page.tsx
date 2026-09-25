import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth/session";
import { getLeadById } from "@/features/leads/queries";
import { LeadStatusSelect } from "@/features/leads/components/LeadStatusSelect";
import { LeadNotes } from "@/features/leads/components/LeadNotes";
import { PageHeader } from "@/components/shared/PageHeader";
import { buildLeadsHref } from "@/features/leads/search-params";

export const metadata: Metadata = { title: "Lead Detail" };

const ACTIVITY_LABELS: Record<string, string> = {
  status_changed: "Status changed",
  note_added: "Note added",
};

const panelClass = "rounded-[20px] border border-[var(--color-border)] bg-white/95 p-5 shadow-sm";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  const result = await getLeadById(id);
  if (!result || result.inquiry.seller_id !== seller.id) notFound();

  const { inquiry, notes, activity } = result;

  return (
    <div className="space-y-6">
      <div>
        <Link href={buildLeadsHref({})} className="text-sm text-[var(--color-muted)] hover:underline">
          ← All leads
        </Link>
      </div>

      <PageHeader
        title={`${inquiry.first_name} ${inquiry.last_name}`}
        description={`Received ${new Date(inquiry.created_at).toLocaleString()}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={panelClass}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Inquiry</h2>
            {inquiry.properties ? (
              <p className="text-sm">
                <span className="text-[var(--color-muted)]">Property</span>{" "}
                {inquiry.property_id ? (
                  <Link href={`/dashboard/properties/${inquiry.property_id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                    {inquiry.properties.title || inquiry.properties.address_line_1}
                  </Link>
                ) : (
                  <span className="font-medium">{inquiry.properties.title}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">General inquiry — not tied to a property.</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Field label="Inquiry type" value={inquiry.inquiry_type.replace(/_/g, " ")} />
              <Field label="Buying stage" value={inquiry.buying_stage.replace(/_/g, " ")} />
              <Field label="Working with an agent" value={inquiry.agent_status.replace(/_/g, " ")} />
              <Field label="Preferred contact" value={inquiry.preferred_contact_method} />
            </dl>
            {inquiry.message && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <p className="text-sm font-semibold text-[var(--color-muted)]">Message</p>
                <p className="mt-1 whitespace-pre-line text-sm">{inquiry.message}</p>
              </div>
            )}
          </section>

          <section className={panelClass}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Private Notes</h2>
            <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">Only you can see these notes.</p>
            <LeadNotes inquiryId={inquiry.id} notes={notes} />
          </section>

          {activity.length > 0 && (
            <section className={panelClass}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">History</h2>
              <ul className="space-y-2 text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)] pb-2 last:border-0">
                    <span>
                      {ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}
                      {a.new_value ? ` → ${a.new_value}` : ""}
                    </span>
                    <span className="text-[var(--color-muted-foreground)]">{new Date(a.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className={panelClass}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Pipeline status</h2>
            <LeadStatusSelect inquiryId={inquiry.id} status={inquiry.lead_status} />
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              Changing this moves the lead between pipeline categories. It does not change the property&apos;s listing status.
            </p>
          </section>

          <section className={panelClass}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Contact</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[var(--color-muted-foreground)]">Email</p>
                <a href={`mailto:${inquiry.email}`} className="font-medium text-[var(--color-accent)] hover:underline">
                  {inquiry.email}
                </a>
              </div>
              <div>
                <p className="text-[var(--color-muted-foreground)]">Phone</p>
                {inquiry.phone ? (
                  <a href={`tel:${inquiry.phone}`} className="font-medium text-[var(--color-accent)] hover:underline">
                    {inquiry.phone}
                  </a>
                ) : (
                  <p className="text-[var(--color-muted)]">Not provided</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              These open your email app or dialer. Move the lead to Contacted yourself once you have actually reached out.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}
