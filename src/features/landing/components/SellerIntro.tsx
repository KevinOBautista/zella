import Image from "next/image";
import { landingImages } from "@/features/landing/data";
import { DemoSellerProfile } from "./DemoSellerProfile";
import { SellerSpotlight } from "./SellerSpotlight";
import type { SellerCardData } from "@/features/sellers/components/SellerCard";

/** Shows a real featured seller when one exists; otherwise the labeled sample profile. */
export function SellerIntro({
  seller,
  isFollowing,
  isLoggedIn,
}: {
  seller: SellerCardData | null;
  isFollowing: boolean;
  isLoggedIn: boolean;
}) {
  return (
    <section aria-labelledby="seller-intro-heading" className="relative z-10 -mt-40 px-4 sm:-mt-48 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[32px] bg-[var(--color-background)] p-4 shadow-[0_-8px_40px_rgba(28,28,26,0.08)] sm:p-6 lg:p-8">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="rounded-[24px] bg-white p-6 sm:p-8 lg:col-span-6 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Built around the seller
            </p>
            <h2
              id="seller-intro-heading"
              className="mt-5 text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Your properties.
              <br />
              Your own presence.
            </h2>
            <p className="mt-6 max-w-md text-base text-[var(--color-muted)]">
              Give buyers one place to discover your available homes, upcoming listings, and past sales. Build a profile that grows with your portfolio.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
            <div className="flex flex-col justify-between rounded-[24px] border border-[var(--color-border)] bg-white p-6 sm:p-7">
              <h3 className="text-2xl font-normal leading-tight tracking-tight">One profile. Every property.</h3>
              <p className="mt-10 text-sm text-[var(--color-muted)]">
                Bring active listings, coming-soon homes, and your sold portfolio together.
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-[24px] border border-[var(--color-border)] bg-white p-6 sm:p-7">
              <h3 className="text-2xl font-normal leading-tight tracking-tight">Connect on your terms.</h3>
              <p className="mt-10 text-sm text-[var(--color-muted)]">
                Receive buyer inquiries while keeping your contact information private.
              </p>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[24px] lg:col-span-12 lg:min-h-[460px]">
            <Image
              src={landingImages.sellerIntroWide}
              alt="Suburban home with a lawn and a sidewalk on a bright day"
              fill
              loading="lazy"
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#1c1c1a]/35 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-end p-4 sm:items-center sm:p-8 lg:p-12">
              {seller ? (
                <SellerSpotlight seller={seller} isFollowing={isFollowing} isLoggedIn={isLoggedIn} />
              ) : (
                <DemoSellerProfile />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
