"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { brand } from "@/config/brand";
import { NativeDialog } from "@/components/ui/native-dialog";
import { DashboardSidebar } from "./DashboardSidebar";

/**
 * Mobile dashboard navigation. The drawer is a native <dialog>, so the
 * browser provides the focus trap, Escape handling and focus return.
 */
export function DashboardMobileHeader({
  displayName,
  username,
  initial,
}: {
  displayName: string;
  username: string;
  initial: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
      <Link href="/" className="font-display text-lg">
        {brand.name}
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open dashboard menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-background)]"
      >
        <Menu size={22} aria-hidden="true" />
      </button>
      {open && (
        <NativeDialog open onClose={() => setOpen(false)} title="Dashboard menu" className="max-w-sm">
          <DashboardSidebar
            displayName={displayName}
            username={username}
            initial={initial}
            onNavigate={() => setOpen(false)}
          />
        </NativeDialog>
      )}
    </div>
  );
}
