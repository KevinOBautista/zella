import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-center">
      <h1 className="font-display mb-4 text-3xl">Contact Us</h1>
      <p className="text-[var(--color-muted)]">
        For support, questions, or to report an issue, email us at{" "}
        <a href={`mailto:${brand.supportEmail}`} className="text-[var(--color-accent)] underline">
          {brand.supportEmail}
        </a>
        .
      </p>
      <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
        {brand.name} is a property marketing and buyer-lead platform and is not able to provide
        legal, financial, or transaction advice.
      </p>
    </main>
  );
}
