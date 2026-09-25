"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog> element so the browser provides the
 * focus trap, Escape handling, inert background and focus return to the
 * opener. Prefer this over ui/dialog.tsx for new dialogs.
 */
export function NativeDialog({
  open,
  onClose,
  title,
  children,
  className,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      el.showModal();
      initialFocusRef?.current?.focus();
    }
    if (!open && el.open) el.close();
  }, [open, initialFocusRef]);

  // Return focus to whatever opened the dialog, including when the parent
  // unmounts this component instead of flipping `open` to false.
  useEffect(() => {
    return () => {
      const opener = openerRef.current;
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  // Escape (native `cancel`), programmatic close, and a belt-and-braces
  // keydown handler all funnel into onClose so React state stays the owner.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => onClose();
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    el.addEventListener("close", handleClose);
    el.addEventListener("cancel", handleCancel);
    el.addEventListener("keydown", handleKey);
    return () => {
      el.removeEventListener("close", handleClose);
      el.removeEventListener("cancel", handleCancel);
      el.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-foreground)] shadow-xl backdrop:bg-black/40",
        className,
      )}
    >
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-background)]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
