"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createPropertyAction, saveWizardStepAction } from "@/features/properties/wizard-actions";

/**
 * Shared save-then-advance behavior for every wizard step form. A null
 * propertyId means the "Add Property" flow: step 1 creates the property.
 */
export function useWizardStep(propertyId: string | null, step: number) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function save(data: unknown, opts?: { nextStep?: number }) {
    setPending(true);
    const result = propertyId
      ? await saveWizardStepAction(propertyId, step, data)
      : await createPropertyAction(data);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return false;
    }
    const id = "propertyId" in result ? result.propertyId : propertyId;
    const next = opts?.nextStep ?? step + 1;
    router.push(`/dashboard/properties/${id}/edit?step=${next}`);
    return true;
  }

  return { save, pending };
}
