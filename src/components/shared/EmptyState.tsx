import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
  size = "default",
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  /** "compact" keeps in-page category placeholders from eating the screen. */
  size?: "default" | "compact";
  className?: string;
}) {
  return (
    <div className={cn(
        "flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-6 text-center",
        size === "compact" ? "py-6" : "py-16",
        className,
      )}>
      <p className="font-medium text-[var(--color-foreground)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">{description}</p>}
      {(actionLabel && actionHref) || (secondaryActionLabel && secondaryActionHref) ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actionLabel && actionHref && (
            <Link href={actionHref} className={buttonVariants({ variant: "secondary" })}>
              {actionLabel}
            </Link>
          )}
          {secondaryActionLabel && secondaryActionHref && (
            <Link href={secondaryActionHref} className={buttonVariants({ variant: "ghost" })}>
              {secondaryActionLabel}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
