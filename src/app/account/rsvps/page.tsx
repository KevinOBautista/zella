import type { Metadata } from "next";
import { requireVerifiedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deriveOpenHouseState } from "@/features/open-houses/domain";
import { formatOpenHouseDateTime } from "@/features/open-houses/format";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { CancelRsvpButton } from "@/features/open-houses/components/CancelRsvpButton";

export const metadata: Metadata = { title: "My RSVPs" };

export default async function MyRsvpsPage() {
  const user = await requireVerifiedUser();
  const supabase = await createClient();
  const { data: rsvps } = await supabase
    .from("open_house_rsvps")
    .select("*, open_houses(starts_at, ends_at, status, properties(title, address_line_1, city, state, slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const now = new Date();
  const withState = (rsvps ?? []).map((r) => ({
    ...r,
    derivedState:
      r.status === "cancelled"
        ? "cancelled"
        : r.open_houses
          ? deriveOpenHouseState({ status: r.open_houses.status, endsAt: new Date(r.open_houses.ends_at) }, now)
          : "past",
  }));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl">My RSVPs</h1>
      {(["upcoming", "past", "cancelled"] as const).map((group) => {
        const items = withState.filter((r) => r.derivedState === group);
        if (items.length === 0) return null;
        return (
          <section key={group}>
            <h2 className="mb-3 text-lg font-semibold capitalize">{group}</h2>
            <div className="space-y-2">
              {items.map((r) => (
                <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{r.open_houses?.properties?.title ?? r.open_houses?.properties?.address_line_1}</p>
                    {r.open_houses && <p className="text-sm text-[var(--color-muted)]">{formatOpenHouseDateTime(r.open_houses.starts_at, r.open_houses.ends_at)}</p>}
                  </div>
                  {group === "upcoming" && <CancelRsvpButton rsvpId={r.id} />}
                </Card>
              ))}
            </div>
          </section>
        );
      })}
      {withState.length === 0 && <EmptyState title="No RSVPs yet" actionLabel="Browse Open Houses" actionHref="/open-houses" />}
    </div>
  );
}
