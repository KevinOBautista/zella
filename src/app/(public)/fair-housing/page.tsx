import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Fair Housing Policy" };

export default function FairHousingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display mb-6 text-3xl">Fair Housing Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed text-[var(--color-foreground)]">
        <p>Last updated: {brand.legal.fairHousingVersion}</p>
        <p>
          {brand.name} is committed to compliance with the federal Fair Housing Act and all
          applicable state and local fair housing laws. It is illegal to indicate any preference,
          limitation, or discrimination based on race, color, religion, sex, disability, familial
          status, or national origin in the sale or rental of housing.
        </p>
        <h2 className="text-lg font-semibold">Prohibited listing content</h2>
        <p>
          Listings and descriptions may not include discriminatory language or preferences of any
          kind. Sellers are solely responsible for ensuring their listings comply with fair housing
          law. {brand.name} does not ask buyers or sellers for protected-class information anywhere
          on the platform.
        </p>
        <h2 className="text-lg font-semibold">Reporting a concern</h2>
        <p>
          Any listing or seller profile can be reported using the &quot;Report&quot; action on its
          page. Our team reviews reports and may remove content or suspend accounts that violate fair
          housing law or this policy. This is a moderation process, not an automated or algorithmic
          determination.
        </p>
      </div>
    </main>
  );
}
