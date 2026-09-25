"use client";

import { LoadError } from "@/components/shared/LoadError";

export default function HomePageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <LoadError error={error} reset={reset} message="We couldn't load the home page right now." backHref="/homes" backLabel="Explore homes" />;
}
