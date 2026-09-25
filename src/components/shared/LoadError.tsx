"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Honest failure state for public pages: shown when the backend can't be
 * reached, instead of an empty list or substitute content.
 */
export function LoadError({
  error,
  reset,
  message,
  backHref,
  backLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  message: string;
  backHref: string;
  backLabel: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div role="alert" className="flex flex-col items-center rounded-[20px] border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
        <p className="font-medium">{message}</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">Something went wrong on our side. Please try again in a moment.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset} className="rounded-full bg-[var(--color-foreground)]">
            Retry
          </Button>
          <Link href={backHref} className={cn(buttonVariants({ variant: "secondary" }), "rounded-full")}>
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
