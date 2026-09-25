"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { canPublish } from "@/features/properties/domain";
import { publishPropertyAction } from "@/features/properties/wizard-actions";
import type { Tables } from "@/types/database";

type Props = {
  propertyId: string;
  property: Tables<"properties">;
  photoCount: number;
  coverImagePath: string | null;
};

export function Step7Review({ propertyId, property, photoCount, coverImagePath }: Props) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const targetStatus = property.target_listing_status === "coming_soon" ? "coming_soon" : "for_sale";

  const validation = canPublish({
    addressLine1: property.address_line_1,
    city: property.city,
    state: property.state,
    postalCode: property.postal_code,
    propertyType: property.property_type,
    listingStatus: targetStatus,
    pricingType: property.pricing_type,
    askingPriceCents: property.asking_price_cents,
    expectedPriceMinCents: property.expected_price_min_cents,
    expectedPriceMaxCents: property.expected_price_max_cents,
    photoCount,
    publishAcknowledged: true, // checked separately below via the checkbox
  });

  const checklist: { label: string; ok: boolean }[] = [
    { label: "Address", ok: Boolean(property.address_line_1 && property.city && property.state && property.postal_code) },
    {
      label: "Price",
      ok:
        property.pricing_type === "price_undecided" ||
        (property.pricing_type === "asking_price" && Boolean(property.asking_price_cents)) ||
        (property.pricing_type === "expected_range" && Boolean(property.expected_price_min_cents && property.expected_price_max_cents)),
    },
    { label: "Description", ok: Boolean(property.title) },
    { label: "Photos", ok: photoCount >= 1 },
    { label: "Contact routing", ok: Boolean(property.lead_recipient) },
  ];

  async function handlePublish() {
    if (!acknowledged) {
      toast.error("Please confirm the authorization statement before publishing.");
      return;
    }
    setPublishing(true);
    const result = await publishPropertyAction(propertyId, targetStatus, acknowledged);
    setPublishing(false);
    if ("error" in result) {
      toast.error(result.error);
      if (result.step) router.push(`/dashboard/properties/${propertyId}/edit?step=${result.step}`);
      return;
    }
    toast.success(targetStatus === "for_sale" ? "Property published!" : "Coming Soon listing published!");
    router.push(`/dashboard/properties/${propertyId}`);
  }

  // Already live: every step saved as the seller went, so there is nothing to publish.
  if (property.published_at !== null) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-[var(--color-muted)]">Your changes are saved and live on the listing.</p>
        <Link href={`/dashboard/properties/${propertyId}`} className="text-sm font-medium text-[var(--color-accent)] underline">
          Back to Property
        </Link>
      </div>
    );
  }

  if (!property.target_listing_status) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-[var(--color-muted)]">
          This property will be saved as a draft. To publish it, go back to Sale Status and choose For
          Sale or Coming Soon.
        </p>
        <Link href="/dashboard/properties" className="text-sm font-medium text-[var(--color-accent)] underline">
          Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="overflow-hidden">
        <div className="relative aspect-[16/9] bg-[var(--color-accent-soft)]">
          {coverImagePath && <Image src={propertyImageUrl(coverImagePath)!} alt="" fill className="object-cover" />}
        </div>
        <div className="p-4">
          <p className="text-lg font-semibold">
            {property.pricing_type === "asking_price"
              ? formatCents(property.asking_price_cents)
              : property.pricing_type === "expected_range"
                ? `${formatCents(property.expected_price_min_cents)} – ${formatCents(property.expected_price_max_cents)}`
                : "Price to be shared"}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {property.address_visibility === "full" ? property.address_line_1 : property.city}, {property.city}, {property.state}
          </p>
          <p className="mt-2 text-sm">{property.title}</p>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-sm font-medium">Checklist</p>
        <ul className="space-y-1 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className={item.ok ? "text-[var(--color-accent)]" : "text-[var(--color-danger)]"}>
              {item.ok ? "✓" : "✗"} {item.label}
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
        <span>
          I confirm that I am authorized to advertise this property and that the information I have
          provided is accurate to the best of my knowledge. I agree to the{" "}
          <Link href="/terms" className="underline" target="_blank">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline" target="_blank">
            Privacy Policy
          </Link>
          , and{" "}
          <Link href="/fair-housing" className="underline" target="_blank">
            Fair Housing Policy
          </Link>
          .
        </span>
      </label>

      {!validation.ok && (
        <p className="text-sm text-[var(--color-danger)]">
          Fix the items above before publishing: {validation.errors.map((e) => e.message).join(", ")}
        </p>
      )}

      <div className="flex gap-3">
        <Link href={`/homes/${property.slug ?? ""}`} target="_blank" className="text-sm font-medium text-[var(--color-accent)] underline">
          Preview
        </Link>
      </div>

      <Button onClick={handlePublish} loading={publishing} disabled={!acknowledged}>
        Publish Property
      </Button>
    </div>
  );
}
