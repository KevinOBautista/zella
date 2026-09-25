import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** A quiet, inline notice for demo content, in the page's existing muted text style. */
export function DemoNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="note" className={cn("flex items-start gap-1.5 text-sm text-[var(--color-muted)]", className)}>
      <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
