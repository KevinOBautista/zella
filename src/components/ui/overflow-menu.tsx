"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type OverflowMenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  /** Opens in a new tab — used for links out to the public site. */
  external?: boolean;
  tone?: "default" | "danger";
};

const itemClass =
  "flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-foreground)] outline-none hover:bg-[var(--color-background)] focus-visible:bg-[var(--color-background)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]";

/**
 * Generic "…" dropdown, sharing the keyboard contract of the account menu
 * in components/layout/AvatarMenu.tsx: Enter/Space/ArrowDown open and focus
 * the first item, arrows cycle, Home/End jump, Escape closes and returns
 * focus, Tab closes. Rendered as a sibling of any surrounding card link so
 * a button is never nested inside an anchor.
 */
export function OverflowMenu({
  label,
  items,
  align = "right",
  trigger,
  className,
}: {
  label: string;
  items: OverflowMenuItem[];
  align?: "left" | "right";
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const menuItems = useCallback(() => {
    if (!menuRef.current) return [] as HTMLElement[];
    return Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }, []);

  const focusItem = useCallback(
    (index: number) => {
      const list = menuItems();
      if (!list.length) return;
      const i = ((index % list.length) + list.length) % list.length;
      list[i]?.focus();
    },
    [menuItems],
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
    const list = menuItems();
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
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          // The card photo behind this menu is a link; opening the menu
          // must never navigate.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/95 text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-white",
          open && "border-[var(--color-accent)]",
        )}
      >
        {trigger ?? <MoreHorizontal size={18} aria-hidden="true" />}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg shadow-black/5",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                onClick={() => close(false)}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(itemClass, item.tone === "danger" && "text-[var(--color-danger)]")}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  item.onSelect?.();
                  close(false);
                }}
                className={cn(itemClass, item.tone === "danger" && "text-[var(--color-danger)]")}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
