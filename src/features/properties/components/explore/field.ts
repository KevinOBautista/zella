import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared field styling for the Explore search panel, mirroring the landing hero search. */
export const fieldClass =
  "h-12 w-full rounded-[12px] border border-[var(--color-border)] bg-white px-3.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:border-[var(--color-foreground)] focus-visible:outline-none aria-[invalid=true]:border-[var(--color-danger)]";

// Pills are the shared Button variants with a rounded-full shape, so the
// Explore controls and the landing nav can't drift apart.
export const pillPrimaryClass = buttonVariants({ variant: "primary", shape: "pill" });

export const pillSecondaryClass = cn(buttonVariants({ variant: "secondary", size: "sm", shape: "pill" }), "px-4");
