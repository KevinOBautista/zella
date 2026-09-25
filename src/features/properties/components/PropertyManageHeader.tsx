import Link from "next/link";
import { EyeOff } from "lucide-react";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { CardImage } from "./CardImage";
import { ListingStatusBadge } from "./ListingStatusBadge";
import { QRCodeDialog } from "@/components/shared/QRCodeDialog";
import { buttonVariants } from "@/components/ui/button";
import type { Enums } from "@/types/database";

/**
 * Photographic header for a single property's management page. This is the
 * one place the dashboard uses large imagery with overlaid text — grid
 * cards keep their details beneath the photo.
 *
 * Readability comes from a gradient scrim rather than a text shadow, so the
 * overlay holds up over bright and busy photographs alike. Actions sit
 * below the photo so they stay visible on touch devices and keyboard focus
 * instead of appearing on hover.
 */
export function PropertyManageHeader({
  propertyId,
  title,
  displayLine,
  listingStatus,
  price,
  coverImagePath,
  addressHiddenPublicly,
  publicUrl,
}: {
  propertyId: string;
  title: string;
  /** The seller's own view: the full address, even when hidden publicly. */
  displayLine: string | null;
  listingStatus: Enums<"property_status">;
  price: string | null;
  coverImagePath: string | null;
  addressHiddenPublicly: boolean;
  publicUrl: string | null;
}) {
  return (
    <header className="space-y-4">
      <div className="group relative aspect-[21/9] min-h-[13rem] overflow-hidden rounded-[24px] bg-[var(--color-border)]">
        <CardImage src={propertyImageUrl(coverImagePath)} sizes="(min-width: 1024px) 66vw, 100vw" priority />
        <div
          data-scrim="true"
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ListingStatusBadge status={listingStatus} />
              {price && (
                <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[var(--color-foreground)]">
                  {price}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">{title}</h1>
            {displayLine && <p className="mt-1 text-sm text-white/85">{displayLine}</p>}
          </div>
        </div>
      </div>

      {addressHiddenPublicly && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <EyeOff size={15} aria-hidden="true" />
          The exact address is hidden on the public listing. Buyers see the city and area only.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/properties/${propertyId}/edit?step=1`} className={buttonVariants({ size: "sm" })}>
          Edit Property
        </Link>
        <Link
          href={`/dashboard/properties/${propertyId}/edit?step=6`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          {coverImagePath ? "Manage Photos" : "Add Photos"}
        </Link>
        {publicUrl && (
          <>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              View Public Listing
            </a>
            <QRCodeDialog url={publicUrl} trigger={<span className={buttonVariants({ variant: "secondary", size: "sm" })}>QR Code</span>} />
          </>
        )}
      </div>
    </header>
  );
}
