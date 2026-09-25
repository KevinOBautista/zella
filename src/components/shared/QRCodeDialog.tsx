"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog } from "@/components/ui/dialog";

export function QRCodeDialog({ url, trigger }: { url: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(null));
  }, [open, url]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onClose={() => setOpen(false)} title="QR Code">
        <div className="flex flex-col items-center gap-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URL, not an optimizable remote image
            <img src={dataUrl} alt={`QR code linking to ${url}`} width={240} height={240} />
          ) : (
            <div className="h-60 w-60 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-background)]" />
          )}
          <p className="break-all text-center text-xs text-[var(--color-muted-foreground)]">{url}</p>
          {dataUrl && (
            <a href={dataUrl} download="qr-code.png" className="text-sm font-medium text-[var(--color-accent)] underline">
              Download
            </a>
          )}
        </div>
      </Dialog>
    </>
  );
}
