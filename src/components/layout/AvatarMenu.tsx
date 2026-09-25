"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import {
  ADD_PROPERTY_PATH,
  SELLER_DASHBOARD_PATH,
  SELLER_ONBOARDING_PATH,
  type AccountState,
} from "@/lib/seller-routing";

type Props = {
  initial: string;
  state: Exclude<AccountState, "guest">;
  /** "landing" uses the white/blur pill treatment of the landing nav. */
  variant?: "site" | "landing";
};

const itemClass =
  "flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-foreground)] outline-none hover:bg-[var(--color-background)] focus-visible:bg-[var(--color-background)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]";

/**
 * Account dropdown for signed-in users. Functionally mirrors the dashboard's
 * account menu (same destinations) but styled to the landing page tokens.
 * Keyboard: Enter/Space/ArrowDown open and focus the first item, Arrow keys
 * cycle, Home/End jump, Escape closes and returns focus, Tab closes.
 */
export function AvatarMenu({ initial, state, variant = "site" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = useCallback(() => {
    if (!menuRef.current) return [] as HTMLElement[];
    return Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }, []);

  const focusItem = useCallback(
    (index: number) => {
      const list = items();
      if (!list.length) return;
      const i = ((index % list.length) + list.length) % list.length;
      list[i]?.focus();
    },
    [items],
  );

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (open) focusItem(0);
  }, [open, focusItem]);

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const list = items();
    const current = list.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(list.length - 1);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        className={cn(
          "flex items-center justify-center rounded-full text-sm font-semibold transition-colors",
          variant === "landing"
            ? "h-11 w-11 bg-white/90 text-[var(--color-foreground)] backdrop-blur hover:bg-white"
            : "h-9 w-9 border border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:border-[var(--color-accent)]",
          open && (variant === "landing" ? "bg-white" : "border-[var(--color-accent)]"),
        )}
      >
        {initial}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg shadow-black/5"
        >
          <MenuLink href="/account" onNavigate={() => close(false)}>
            My Account
          </MenuLink>
          <MenuLink href="/account/saved" onNavigate={() => close(false)}>
            Saved Homes
          </MenuLink>
          <MenuLink href="/account/following" onNavigate={() => close(false)}>
            Following
          </MenuLink>
          <MenuLink href="/account/rsvps" onNavigate={() => close(false)}>
            My RSVPs
          </MenuLink>
          <Divider />
          {state === "seller" ? (
            <>
              <MenuLink href={SELLER_DASHBOARD_PATH} onNavigate={() => close(false)}>
                Seller Dashboard
              </MenuLink>
              <MenuLink href={ADD_PROPERTY_PATH} onNavigate={() => close(false)}>
                List a Property
              </MenuLink>
            </>
          ) : (
            <MenuLink href={SELLER_ONBOARDING_PATH} onNavigate={() => close(false)}>
              Start Selling
            </MenuLink>
          )}
          <Divider />
          <MenuLink href="/account/settings" onNavigate={() => close(false)}>
            Settings
          </MenuLink>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" tabIndex={-1} className={cn(itemClass, "text-[var(--color-danger)]")}>
              Log Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-[var(--color-border)]" />;
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} role="menuitem" tabIndex={-1} onClick={onNavigate} className={itemClass}>
      {children}
    </Link>
  );
}
