"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LayoutGrid, X } from "lucide-react";
import { AI_IMAGE_CREDIT, DEMO_COPY } from "@/features/demo/constants";

export type GalleryImage = { src: string; alt: string; credit?: string | null };

/** Distinct credits, with the AI credit phrased once for the whole set. */
function creditLine(images: GalleryImage[]): string | null {
  const credits = [...new Set(images.map((i) => i.credit).filter((c): c is string => Boolean(c)))];
  if (!credits.length) return null;
  return credits.map((c) => (c === AI_IMAGE_CREDIT ? "AI-generated illustrative images" : c)).join("; ");
}

export function PropertyGallery({ images, isDemo = false }: { images: GalleryImage[]; isDemo?: boolean }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, images.length]);

  if (images.length === 0) {
    return <div className="aspect-[16/10] rounded-[var(--radius-xl)] bg-[var(--color-accent-soft)]" />;
  }

  const thumbnails = images.slice(1, 5);
  const credits = creditLine(images);
  const current = lightboxIndex === null ? null : images[lightboxIndex];

  return (
    <>
      <div className="relative grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[var(--radius-xl)] sm:aspect-[2/1]">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative col-span-4 row-span-2 aspect-[16/10] sm:col-span-2 sm:aspect-auto"
        >
          <Image src={images[0]!.src} alt={images[0]!.alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" priority />
        </button>
        {thumbnails.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setLightboxIndex(i + 1)}
            className="relative hidden sm:block"
          >
            <Image src={img.src} alt="" fill sizes="25vw" className="object-cover" />
          </button>
        ))}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-md transition-colors hover:bg-neutral-100"
          >
            <LayoutGrid size={16} aria-hidden />
            Show all photos ({images.length})
          </button>
        )}
      </div>
      {(isDemo || credits) && (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {[isDemo ? DEMO_COPY.galleryLabel : null, credits ? `${credits}.` : null].filter(Boolean).join(" ")}
        </p>
      )}

      {lightboxIndex !== null && current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between p-4 text-white">
            <p className="text-sm">
              {lightboxIndex + 1} / {images.length}
              {current.credit && <span className="ml-3 text-white/70">{current.credit}</span>}
            </p>
            <button type="button" onClick={() => setLightboxIndex(null)} aria-label="Close">
              <X size={24} />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={current.src} alt={current.alt} fill className="object-contain" sizes="100vw" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length))}
                  className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 sm:block"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length))}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 sm:block"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
