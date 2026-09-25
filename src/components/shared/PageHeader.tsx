import { cn } from "@/lib/utils";

/**
 * Dashboard page heading in the Explore page's type scale, so the seller
 * workspace and the public pages read as one product.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-3xl font-light leading-[1.1] tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
