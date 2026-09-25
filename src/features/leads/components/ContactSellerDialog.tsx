"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ContactSellerForm } from "./ContactSellerForm";
import { DEMO_COPY } from "@/features/demo/constants";

type SellerProperty = { id: string; label: string };

export function ContactSellerDialog({
  sellerId,
  fixedPropertyId,
  hasOpenHouse,
  sellerProperties,
  isLoggedIn,
  triggerLabel = "Contact Seller",
  triggerClassName,
  isDemo = false,
}: {
  sellerId: string;
  fixedPropertyId?: string;
  hasOpenHouse?: boolean;
  sellerProperties?: SellerProperty[];
  isLoggedIn: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Demo listings and sellers explain instead of collecting an inquiry. */
  isDemo?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {isDemo ? (
        <Dialog open={open} onClose={() => setOpen(false)} title={DEMO_COPY.contactTitle}>
          <p className="text-sm text-[var(--color-muted)]">{fixedPropertyId ? DEMO_COPY.contactBody : DEMO_COPY.sellerContactBody}</p>
          <Button type="button" variant="secondary" className="mt-5 self-start" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </Dialog>
      ) : (
        <Dialog open={open} onClose={() => setOpen(false)} title="Contact Seller">
          <ContactSellerForm
            sellerId={sellerId}
            fixedPropertyId={fixedPropertyId}
            hasOpenHouse={hasOpenHouse}
            sellerProperties={sellerProperties}
            isLoggedIn={isLoggedIn}
          />
        </Dialog>
      )}
    </>
  );
}
