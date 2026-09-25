"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">Explore homes.</h1>
      <div role="alert" className="mt-8 flex flex-col items-center rounded-[20px] border border-dashed border-[var(--color-border)] bg-white px-6 py-16 text-center">
        <p className="font-medium">We couldn&apos;t load homes right now.</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">Something went wrong on our side. Please try again in a moment.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset} className="rounded-full bg-[var(--color-foreground)]">
            Retry
          </Button>
          <Link href="/homes" className={cn(buttonVariants({ variant: "secondary" }), "rounded-full")}>
            Clear filters
          </Link>
        </div>
      </div>
    </main>
  );
}
