"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Explains why an action is unavailable on demo content. Performs nothing. */
export function DemoActionDialog({ open, onClose, title, body }: { open: boolean; onClose: () => void; title: string; body: string }) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-[var(--color-muted)]">{body}</p>
      <Button type="button" variant="secondary" className="mt-5 self-start" onClick={onClose}>
        Got it
      </Button>
    </Dialog>
  );
}
