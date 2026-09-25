"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AvatarMenu } from "./AvatarMenu";
import {
  ArrowLeft,
  LayoutDashboard,
  Home,
  Users,
  CalendarClock,
  UserCircle,
  Bell,
  Settings,
  ExternalLink,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/properties", label: "Properties", icon: Home },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/open-houses", label: "Open Houses", icon: CalendarClock },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/**
 * The single persistent dashboard rail. The account dropdown is the same
 * component the public header uses, so a seller keeps every buyer
 * capability — Saved Homes, Following, My RSVPs — without switching
 * accounts.
 */
export function DashboardSidebar({
  displayName,
  username,
  initial,
  onNavigate,
}: {
  displayName: string;
  username: string;
  initial: string;
  /** Lets the mobile drawer close itself when a destination is chosen. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex h-full flex-col gap-1 p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-2 flex items-center gap-3 rounded-full px-3 py-2.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)]"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Site
      </Link>
      <div className="mb-4 flex items-center gap-3 px-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{displayName}</p>
          <p className="truncate text-sm text-[var(--color-muted)]">@{username}</p>
        </div>
        <AvatarMenu initial={initial} state="seller" />
      </div>
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "text-[var(--color-foreground)] hover:bg-[var(--color-background)]",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
      <Link
        href={`/@${username}`}
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 rounded-full px-3 py-2.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)]"
        target="_blank"
      >
        <ExternalLink size={18} aria-hidden="true" />
        View Public Profile
      </Link>
    </nav>
  );
}
