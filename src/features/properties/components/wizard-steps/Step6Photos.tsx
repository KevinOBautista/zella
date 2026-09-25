"use client";

import { Button } from "@/components/ui/button";
import { ImageUploader, type UploaderImage } from "@/features/properties/components/ImageUploader";
import { useWizardStep } from "./useWizardStep";

export function Step6Photos({ propertyId, initialImages }: { propertyId: string; initialImages: UploaderImage[] }) {
  const { save, pending } = useWizardStep(propertyId, 6);

  return (
    <div className="max-w-2xl space-y-6">
      <ImageUploader propertyId={propertyId} initialImages={initialImages} />
      <Button onClick={() => save({})} loading={pending}>
        Continue
      </Button>
    </div>
  );
}
