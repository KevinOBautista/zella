"use client";

import { LoadError } from "@/components/shared/LoadError";

export default function PropertyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <LoadError error={error} reset={reset} message="We couldn't load this home right now." backHref="/homes" backLabel="Back to homes" />;
}
