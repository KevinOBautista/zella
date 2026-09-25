"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions";
import type { Tables } from "@/types/database";

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  inquiry: (id) => `/dashboard/leads/${id}`,
  open_house: (id) => `/dashboard/open-houses/${id}`,
};

export function NotificationList({ notifications }: { notifications: Tables<"notifications">[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (notifications.length === 0) {
    return <EmptyState title="You're all caught up." />;
  }

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div>
      {hasUnread && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => {
              await markAllNotificationsReadAction();
              router.refresh();
            })}
          >
            <CheckCheck size={14} className="mr-1.5" /> Mark all as read
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {notifications.map((n) => {
          const href = n.entity_type && n.entity_id ? ENTITY_LINKS[n.entity_type]?.(n.entity_id) : undefined;
          const content = (
            <div className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-4 ${n.read_at ? "border-[var(--color-border)]" : "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"}`}>
              <Bell size={16} className="mt-0.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <div className="flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-[var(--color-muted)]">{n.body}</p>}
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </div>
          );
          return (
            <li
              key={n.id}
              onClick={() => {
                if (!n.read_at) startTransition(() => markNotificationReadAction(n.id));
              }}
            >
              {href ? <Link href={href}>{content}</Link> : content}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
