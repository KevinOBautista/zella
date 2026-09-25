import type { Metadata } from "next";
import { requireVerifiedUser } from "@/lib/auth/session";
import { listNotifications } from "@/features/notifications/queries";
import { NotificationList } from "@/features/notifications/components/NotificationList";

export const metadata: Metadata = { title: "Notifications" };

export default async function AccountNotificationsPage() {
  const user = await requireVerifiedUser();
  const notifications = await listNotifications(user.id);

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Notifications</h1>
      <NotificationList notifications={notifications} />
    </div>
  );
}
