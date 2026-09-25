import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { listNotifications } from "@/features/notifications/queries";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata: Metadata = { title: "Notifications" };

export default async function DashboardNotificationsPage() {
  const { user } = await requireSeller();
  const notifications = await listNotifications(user.id);

  return (
    <div className="space-y-8">
      <PageHeader title="Notifications" description="Inquiries, RSVPs and listing updates." />
      <NotificationList notifications={notifications} />
    </div>
  );
}
