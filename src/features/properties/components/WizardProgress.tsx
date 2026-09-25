import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = ["Property", "Sale Status", "Details", "Price", "Description", "Photos", "Review"];

/** propertyId is null while adding a property: later steps can't be reached until step 1 creates it. */
export function WizardProgress({ propertyId, currentStep }: { propertyId: string | null; currentStep: number }) {
  return (
    <ol className="mb-8 flex flex-wrap gap-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCurrent = step === currentStep;
        const isDone = step < currentStep;
        const className = cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
          isCurrent && "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
          isDone && !isCurrent && "border-[var(--color-border)] text-[var(--color-muted)]",
          !isCurrent && !isDone && "border-[var(--color-border)] text-[var(--color-muted-foreground)]",
        );
        return (
          <li key={label}>
            {propertyId ? (
              <Link href={`/dashboard/properties/${propertyId}/edit?step=${step}`} className={className}>
                {step}. {label}
              </Link>
            ) : (
              <span className={cn(className, !isCurrent && "opacity-60")} aria-current={isCurrent ? "step" : undefined}>
                {step}. {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
