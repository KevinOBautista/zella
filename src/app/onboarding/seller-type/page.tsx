import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Choose Your Seller Type" };

export default function SellerTypePage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">How will you list properties?</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Both use the same public profile layout — you can&apos;t change this later without support.
      </p>
      <div className="space-y-3">
        <Link href="/onboarding/seller-profile?type=individual">
          <Card className="p-4 transition-colors hover:border-[var(--color-accent)]">
            <p className="font-medium">Individual</p>
            <p className="text-sm text-[var(--color-muted)]">A homeowner, landlord, or independent investor.</p>
          </Card>
        </Link>
        <Link href="/onboarding/seller-profile?type=business">
          <Card className="p-4 transition-colors hover:border-[var(--color-accent)]">
            <p className="font-medium">Business</p>
            <p className="text-sm text-[var(--color-muted)]">A property management company or investment group.</p>
          </Card>
        </Link>
      </div>
    </>
  );
}
