"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { loginHref, type AccountState, type Cta } from "@/lib/seller-routing";
import { accountNavItems, type NavLink } from "@/config/nav";

/**
 * Mobile navigation drawer. Carries the site nav, the signed-in account
 * shortcuts (which sit in a desktop-only pill otherwise), the account-aware
 * seller CTA, and the guest sign-in link.
 */
export function MobileMenu({ links, state, sellerCta }: { links: NavLink[]; state: AccountState; sellerCta: Cta }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-foreground)]"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-[var(--color-surface)] px-6 py-6">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-sm)] px-3 py-3 text-base font-medium hover:bg-[var(--color-background)]"
              >
                {link.label}
              </Link>
            ))}
            {state !== "guest" &&
              accountNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-sm)] px-3 py-3 text-base font-medium hover:bg-[var(--color-background)]"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
          <div className="mt-6 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6">
            <Link
              href={sellerCta.href}
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-medium text-[var(--color-accent-foreground)] hover:opacity-90"
            >
              {sellerCta.label}
            </Link>
            {state === "guest" && (
              <Link href={loginHref()} onClick={() => setOpen(false)} className="px-3 py-2 text-center text-sm">
                Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
