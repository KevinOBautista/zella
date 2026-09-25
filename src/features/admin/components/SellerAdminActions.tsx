"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { adminGrantListingSlotsAction, adminSetSellerStatusAction } from "@/features/admin/actions";

export function SellerAdminActions({ sellerId, status, additionalSlots }: { sellerId: string; status: string; additionalSlots: number }) {
  const router = useRouter();
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [slots, setSlots] = useState(String(additionalSlots));
  const [pending, setPending] = useState(false);

  async function setStatus(next: "active" | "suspended") {
    setPending(true);
    const result = await adminSetSellerStatusAction(sellerId, next);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(next === "suspended" ? "Seller suspended" : "Seller reactivated");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status === "active" ? (
        <ConfirmDialog
          trigger={<Button variant="danger" size="sm">Suspend</Button>}
          title="Suspend this seller?"
          description="Their public profile, active listings, and open houses will be hidden immediately. They'll see a suspension notice when they log in. Nothing is deleted."
          confirmLabel="Suspend"
          onConfirm={() => setStatus("suspended")}
        />
      ) : (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => setStatus("active")}>
          Reactivate
        </Button>
      )}
      <Button size="sm" variant="secondary" onClick={() => setSlotsOpen(true)}>
        Grant Slots
      </Button>
      <Dialog open={slotsOpen} onClose={() => setSlotsOpen(false)} title="Additional listing slots">
        <Label htmlFor="slots">Additional active-listing slots (beyond the free 5)</Label>
        <Input id="slots" type="number" min={0} value={slots} onChange={(e) => setSlots(e.target.value)} />
        <Button
          className="mt-4 w-full"
          loading={pending}
          onClick={async () => {
            setPending(true);
            const result = await adminGrantListingSlotsAction(sellerId, Number(slots));
            setPending(false);
            if ("error" in result) {
              toast.error(result.error);
              return;
            }
            toast.success("Listing slots updated");
            setSlotsOpen(false);
            router.refresh();
          }}
        >
          Save
        </Button>
      </Dialog>
    </div>
  );
}
