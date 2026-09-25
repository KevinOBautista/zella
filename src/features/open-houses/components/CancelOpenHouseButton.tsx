"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cancelOpenHouseAction } from "@/features/open-houses/actions";

export function CancelOpenHouseButton({ openHouseId }: { openHouseId: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={<Button variant="danger">Cancel Event</Button>}
      title="Cancel this open house?"
      description="RSVP'd guests and notified followers will be emailed that this event was cancelled. It will be removed from public open house listings."
      confirmLabel="Cancel Event"
      onConfirm={async () => {
        const result = await cancelOpenHouseAction(openHouseId);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Open house cancelled");
        router.refresh();
      }}
    />
  );
}
