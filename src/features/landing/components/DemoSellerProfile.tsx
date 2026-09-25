import Link from "next/link";

/**
 * Shown in the seller spotlight when no public seller profile exists. It
 * describes the feature without inventing a seller, listings or sales.
 */
export function DemoSellerProfile() {
  return (
    <div className="w-full max-w-sm rounded-[24px] bg-white/95 p-5 shadow-lg backdrop-blur">
      <p className="font-semibold">Seller profiles appear here.</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Each seller gets one page for their homes for sale, coming-soon listings and past sales.
      </p>
      <Link href="/sellers" className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline">
        Discover sellers →
      </Link>
    </div>
  );
}
