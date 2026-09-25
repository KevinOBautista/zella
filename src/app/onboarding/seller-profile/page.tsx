import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSellerProfileAction } from "@/features/sellers/actions";
import { SellerProfileForm } from "@/features/sellers/components/SellerProfileForm";

export const metadata: Metadata = { title: "Create Your Seller Page" };

export default async function SellerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const accountType = type === "business" ? "business" : "individual";
  if (type !== "business" && type !== "individual") {
    redirect("/onboarding/seller-type");
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Create your seller page</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        This becomes your public profile — buyers will find your properties here.
      </p>
      <SellerProfileForm mode="create" accountType={accountType} action={createSellerProfileAction} />
    </>
  );
}
