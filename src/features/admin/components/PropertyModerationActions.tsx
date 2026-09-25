"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { adminSetPropertyModerationAction } from "@/features/admin/actions";

export function PropertyModerationActions({ propertyId, moderationStatus }: { propertyId: string; moderationStatus: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setStatus(status: "hidden" | "clear") {
    setPending(true);
    const result = await adminSetPropertyModerationAction(propertyId, status);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(status === "hidden" ? "Property hidden" : "Property restored");
    router.refresh();
  }

  return moderationStatus === "hidden" ? (
    <Button size="sm" variant="secondary" loading={pending} onClick={() => setStatus("clear")}>
      Restore
    </Button>
  ) : (
    <ConfirmDialog
      trigger={<Button size="sm" variant="danger">Hide</Button>}
      title="Hide this property?"
      description="It will immediately stop appearing on public pages. The seller will see a moderation notice; nothing is deleted."
      confirmLabel="Hide"
      onConfirm={() => setStatus("hidden")}
    />
  );
}
