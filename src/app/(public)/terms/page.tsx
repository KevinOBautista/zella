import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display mb-6 text-3xl">Terms of Service</h1>
      <div className="prose max-w-none space-y-4 text-sm leading-relaxed text-[var(--color-foreground)]">
        <p>Last updated: {brand.legal.termsVersion}</p>
        <p>
          {brand.name} is a property marketing and buyer-lead platform. We are not a licensed real
          estate brokerage, attorney, lender, inspector, appraiser, or closing service, and nothing
          on this platform constitutes legal, financial, or transaction advice.
        </p>
        <h2 className="text-lg font-semibold">What we do</h2>
        <p>
          We let sellers publish property listings and open houses, and let buyers discover them and
          contact sellers directly. All negotiations, showings, contracts, financing, inspections,
          and closings happen entirely outside this platform, between the buyer and seller (or their
          representatives).
        </p>
        <h2 className="text-lg font-semibold">Seller responsibilities</h2>
        <p>
          Sellers are solely responsible for the accuracy of information they publish and must be
          authorized to advertise each property they list. Before publishing, sellers must confirm:
          &quot;I confirm that I am authorized to advertise this property and that the information I
          have provided is accurate to the best of my knowledge.&quot;
        </p>
        <h2 className="text-lg font-semibold">No commission or savings promises</h2>
        <p>
          We make no representations about commission savings and do not facilitate or process any
          real estate transaction, financial or otherwise.
        </p>
        <h2 className="text-lg font-semibold">Account and content standards</h2>
        <p>
          Fraudulent, discriminatory, or misleading listings are prohibited and may be removed. See
          our Fair Housing Policy. Reports of policy violations are reviewed by our team.
        </p>
      </div>
    </main>
  );
}
