"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExplorePageHeader } from "@/components/shared/ExplorePageHeader";

export default function SellersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <ExplorePageHeader title="Discover Sellers" />
      <div role="alert" className="mt-8 flex flex-col items-center rounded-[20px] border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
        <p className="font-medium">We couldn&apos;t load sellers right now.</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">Something went wrong on our side. Please try again in a moment.</p>
        <div className="mt-5">
          <Button type="button" onClick={reset} className="rounded-full bg-[var(--color-foreground)]">
            Retry
          </Button>
        </div>
      </div>
    </main>
  );
}
