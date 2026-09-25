import type { Metadata } from "next";
import { requireVerifiedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateNotificationPreferencesAction } from "@/features/notifications/preferences-actions";
import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function AccountSettingsPage() {
  const user = await requireVerifiedUser();
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="font-display text-2xl">Settings</h1>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--color-muted)]">Email me about</h2>
        <form action={updateNotificationPreferencesAction} className="space-y-3">
          <Toggle name="email_followed_new_properties" label="Followed seller: new properties" defaultChecked={prefs?.email_followed_new_properties ?? true} />
          <Toggle name="email_followed_coming_soon" label="Followed seller: Coming Soon properties" defaultChecked={prefs?.email_followed_coming_soon ?? true} />
          <Toggle name="email_followed_open_houses" label="Followed seller: open houses" defaultChecked={prefs?.email_followed_open_houses ?? true} />
          <Button type="submit" size="sm" className="mt-2">
            Save
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--color-muted)]">Account</h2>
        <p className="mb-4 text-sm">
          <span className="text-[var(--color-muted)]">Signed in as</span> {user.email}
        </p>
        <a href="/forgot-password" className="text-sm text-[var(--color-accent)] underline">
          Change password
        </a>
      </Card>

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
      <span>
        <input type="checkbox" name={name} value="on" defaultChecked={defaultChecked} className="h-4 w-4" />
        <input type="hidden" name={name} value="off" />
      </span>
    </label>
  );
}
