import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSeller } from "@/lib/auth/session";
import { WizardProgress } from "@/features/properties/components/WizardProgress";
import { Step1Property } from "@/features/properties/components/wizard-steps/Step1Property";

export const metadata: Metadata = { title: "Add Property" };

export default async function NewPropertyPage() {
  const { isSuspended } = await requireSeller();
  if (isSuspended) redirect("/dashboard");

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl">Add Property</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">Start with the address. You can save and come back anytime.</p>
      <WizardProgress propertyId={null} currentStep={1} />
      <Step1Property />
    </div>
  );
}
