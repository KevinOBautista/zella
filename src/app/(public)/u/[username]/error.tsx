"use client";

import { LoadError } from "@/components/shared/LoadError";

export default function SellerProfileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <LoadError error={error} reset={reset} message="We couldn't load this seller right now." backHref="/sellers" backLabel="Discover sellers" />;
}
