import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateNotificationPreferencesAction } from "@/features/notifications/preferences-actions";
import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata: Metadata = { title: "Settings" };

const panelClass = "rounded-[20px] border border-[var(--color-border)] bg-white/95 p-5 shadow-sm";

export default async function DashboardSettingsPage() {
  const { user, seller } = await requireSeller();
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="max-w-lg space-y-8">
      <PageHeader title="Settings" description="Notification preferences and account details." />

      <section className={panelClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--color-muted)]">Email Notifications</h2>
        <form action={updateNotificationPreferencesAction} className="space-y-3">
          <Toggle name="email_new_leads" label="New buyer inquiries" defaultChecked={prefs?.email_new_leads ?? true} />
          <Toggle name="email_open_house_rsvps" label="New open-house RSVPs" defaultChecked={prefs?.email_open_house_rsvps ?? true} />
          <Button type="submit" size="sm" className="mt-2">
            Save
          </Button>
        </form>
      </section>

      <section className={panelClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--color-muted)]">Account</h2>
        <p className="mb-1 text-sm">
          <span className="text-[var(--color-muted)]">Signed in as</span> {user.email}
        </p>
        <p className="mb-4 text-sm">
          <span className="text-[var(--color-muted)]">Seller status</span> <span className="capitalize">{seller.status}</span>
        </p>
        <a href="/forgot-password" className="text-sm text-[var(--color-accent)] underline">
          Change password
        </a>
      </section>

      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Log Out
        </Button>
      </form>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between text-sm">
      {label}
      {/* An unchecked checkbox submits nothing at all, so a hidden "off"
          fallback (after the checkbox in DOM order, so FormData.get()
          picks the checkbox's "on" first when checked) ensures every
          toggle always has a value. */}
      <span>
        <input type="checkbox" name={name} value="on" defaultChecked={defaultChecked} className="h-4 w-4" />
        <input type="hidden" name={name} value="off" />
      </span>
    </label>
  );
}
