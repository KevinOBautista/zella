import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { requireSeller } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "You're All Set" };

export default async function OnboardingCompletePage() {
  const { seller, isSuspended } = await requireSeller();
  if (isSuspended) redirect("/dashboard");

  return (
    <div className="text-center">
      <h1 className="mb-2 text-xl font-semibold">Your seller page is ready</h1>
      <p className="mb-1 text-[var(--color-muted)]">Share it with buyers:</p>
      <p className="mb-6 font-medium text-[var(--color-accent)]">/@{seller.username}</p>
      <Link href="/dashboard/properties/new" className={cn(buttonVariants(), "w-full")}>
        Add Your First Property
      </Link>
    </div>
  );
}
