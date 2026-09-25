"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { changePropertyStatusAction } from "@/features/properties/status-actions";
import type { Enums } from "@/types/database";

export function PropertyActionsPanel({ propertyId, status }: { propertyId: string; status: Enums<"property_status"> }) {
  const router = useRouter();
  const [soldDialogOpen, setSoldDialogOpen] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [pending, setPending] = useState(false);

  async function run(target: Enums<"property_status">, soldPriceCents?: number) {
    setPending(true);
    const result = await changePropertyStatusAction(propertyId, target, soldPriceCents);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Status updated");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "for_sale" && (
        <Button variant="secondary" size="sm" loading={pending} onClick={() => run("paused")}>
          Pause Listing
        </Button>
      )}
      {status === "coming_soon" && (
        <Button variant="secondary" size="sm" loading={pending} onClick={() => run("paused")}>
          Pause Listing
        </Button>
      )}
      {status === "paused" && (
        <Button variant="secondary" size="sm" loading={pending} onClick={() => run("for_sale")}>
          Resume Listing
        </Button>
      )}
      {status === "for_sale" && (
        <Button variant="secondary" size="sm" loading={pending} onClick={() => run("under_contract")}>
          Mark Under Contract
        </Button>
      )}
      {status === "under_contract" && (
        <Button variant="secondary" size="sm" loading={pending} onClick={() => run("for_sale")}>
          Back to For Sale
        </Button>
      )}
      {(status === "for_sale" || status === "under_contract") && (
        <Button variant="secondary" size="sm" onClick={() => setSoldDialogOpen(true)}>
          Mark Sold
        </Button>
      )}
      {(status === "for_sale" || status === "sold" || status === "under_contract" || status === "paused" || status === "coming_soon") && (
        <ConfirmDialog
          trigger={
            <Button variant="danger" size="sm">
              Archive
            </Button>
          }
          title="Archive this property?"
          description="Archiving removes it from your active lists and the public site. This can't be undone from here — contact support to restore it."
          confirmLabel="Archive"
          onConfirm={() => run("archived")}
        />
      )}

      <Dialog open={soldDialogOpen} onClose={() => setSoldDialogOpen(false)} title="Mark as sold">
        <Label htmlFor="soldPrice">Sold price (optional)</Label>
        <Input id="soldPrice" type="number" min={0} value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} />
        <Button
          className="mt-4 w-full"
          loading={pending}
          onClick={async () => {
            await run("sold", soldPrice ? Math.round(Number(soldPrice) * 100) : undefined);
            setSoldDialogOpen(false);
          }}
        >
          Confirm Sold
        </Button>
      </Dialog>
    </div>
  );
}
