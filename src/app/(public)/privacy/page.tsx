import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display mb-6 text-3xl">Privacy Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed text-[var(--color-foreground)]">
        <p>Last updated: {brand.legal.privacyVersion}</p>
        <h2 className="text-lg font-semibold">What we collect</h2>
        <p>
          Account details (email, name), seller profile information you choose to publish, property
          listings and photos, and information submitted through inquiry, RSVP, and report forms
          (which may include contact details you provide as a buyer or guest).
        </p>
        <h2 className="text-lg font-semibold">How contact information is shared</h2>
        <p>
          A seller&apos;s private email and phone number are never shown publicly. When you contact a
          seller or RSVP to an open house, the information you submit is shared with that seller (and
          their listed agent, if applicable) so they can respond to you directly — it is not shared
          with any other seller or third party for marketing purposes.
        </p>
        <h2 className="text-lg font-semibold">Email</h2>
        <p>
          We send transactional emails related to your account and activity (confirmations,
          notifications you&apos;ve opted into). You can manage notification preferences in your
          account settings.
        </p>
        <h2 className="text-lg font-semibold">Data retention</h2>
        <p>
          We retain account and listing data as needed to operate the platform and for legitimate
          business, legal, and safety purposes, including moderation and abuse investigation.
        </p>
      </div>
    </main>
  );
}
