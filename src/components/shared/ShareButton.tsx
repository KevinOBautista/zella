"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {
            // user cancelled — no-op
          }
          return;
        }
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }}
      className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
    >
      <Share2 size={16} /> Share
    </button>
  );
}
