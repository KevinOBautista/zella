"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelOwnRsvpAction } from "@/features/open-houses/actions";

export function CancelRsvpButton({ rsvpId }: { rsvpId: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        const result = await cancelOwnRsvpAction(rsvpId);
        if (result && "error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("RSVP cancelled");
        router.refresh();
      }}
    >
      Cancel RSVP
    </Button>
  );
}
