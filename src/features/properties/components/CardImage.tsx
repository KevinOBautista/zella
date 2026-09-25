"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cover photo for listing cards. Falls back to a neutral placeholder when
 * there is no photo or the photo fails to load. Alt text is intentionally
 * empty: the surrounding link carries the accessible name, and an address
 * must never leak through image metadata on hidden-address listings.
 */
export function CardImage({
  src,
  sizes,
  priority = false,
  className,
}: {
  src: string | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--color-border)] text-[var(--color-muted)]",
          className,
        )}
      >
        <ImageOff size={22} aria-hidden="true" />
        <span className="text-sm">Photo coming soon</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setErrored(true)}
      className={cn("object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none", className)}
    />
  );
}
