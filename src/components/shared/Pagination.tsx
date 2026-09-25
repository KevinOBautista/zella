import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 1 … p-1 p p+1 … N, with `null` standing in for an ellipsis. */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push(null);
    out.push(n);
  });
  return out;
}

const edgeClass = "inline-flex h-10 items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-medium";

/** Shared numbered pagination, used by both /homes (via ExplorePagination) and /sellers. */
export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const window_ = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(edgeClass, "hover:bg-[var(--color-background)]")}>
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(edgeClass, "opacity-50")}>
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </span>
      )}

      <ul className="flex items-center gap-1">
        {window_.map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-[var(--color-muted)]">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[var(--color-foreground)] px-3 text-sm font-semibold text-white">
                  {n}
                </span>
              ) : (
                <Link
                  href={hrefFor(n)}
                  aria-label={`Page ${n}`}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium hover:bg-white"
                >
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(edgeClass, "hover:bg-[var(--color-background)]")}>
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(edgeClass, "opacity-50")}>
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
