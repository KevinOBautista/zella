import Link from "next/link";
import { brand } from "@/config/brand";
import { requireVerifiedUser } from "@/lib/auth/session";
import { isFixtureMode } from "@/config/runtime";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (isFixtureMode) redirect("/login");
  await requireVerifiedUser("/onboarding");

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16">
      <Link href="/" className="font-display mb-8 text-2xl text-[var(--color-foreground)]">
        {brand.name}
      </Link>
      <div className="w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
