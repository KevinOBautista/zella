"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSaveAction } from "@/features/saves/actions";
import { loginHref } from "@/lib/seller-routing";
import { resumeHref } from "@/lib/auth-resume";
import { DemoActionDialog } from "@/features/demo/components/DemoActionDialog";
import { DEMO_COPY } from "@/features/demo/constants";

export function SaveButton({
  propertyId,
  initialSaved,
  isLoggedIn,
  isDemo = false,
  className,
}: {
  propertyId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
  /** Demo listings explain instead of saving. */
  isDemo?: boolean;
  className?: string;
}) {
  // `saved` only ever reflects persisted state (set from the action result,
  // never optimistically), so a failed request can't show a filled heart.
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
    <button
      type="button"
      aria-label={saved ? "Remove from saved homes" : "Save home"}
      aria-pressed={saved}
      aria-busy={pending}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        if (isDemo) {
          setDemoOpen(true);
          return;
        }
        if (!isLoggedIn) {
          router.push(loginHref({ next: resumeHref("save"), reason: "save" }));
          return;
        }
        startTransition(async () => {
          const result = await toggleSaveAction(propertyId);
          if ("error" in result) {
            toast.error(result.error);
            return;
          }
          setSaved(result.saved);
          toast.success(result.saved ? "Saved to your homes" : "Removed from saved homes");
        });
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[var(--color-foreground)] shadow-sm transition-transform hover:scale-105 disabled:opacity-70",
        className,
      )}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} className={cn(pending && "animate-pulse")} />
    </button>
    {isDemo && <DemoActionDialog open={demoOpen} onClose={() => setDemoOpen(false)} title={DEMO_COPY.saveTitle} body={DEMO_COPY.saveBody} />}
    </>
  );
}
