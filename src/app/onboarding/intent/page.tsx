import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Get Started" };

const options = [
  { href: "/account", title: "I'm buying", description: "Browse homes, save favorites, and follow sellers." },
  {
    href: "/onboarding/seller-type",
    title: "I'm selling",
    description: "Create a seller page and publish your properties.",
  },
  {
    href: "/onboarding/seller-type",
    title: "Both",
    description: "Browse as a buyer and build your own seller page.",
  },
];

export default function OnboardingIntentPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">What brings you here?</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">You can always do both later.</p>
      <div className="space-y-3">
        {options.map((option) => (
          <Link key={option.title} href={option.href}>
            <Card className="p-4 transition-colors hover:border-[var(--color-accent)]">
              <p className="font-medium">{option.title}</p>
              <p className="text-sm text-[var(--color-muted)]">{option.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
