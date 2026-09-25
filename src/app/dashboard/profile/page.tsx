import Link from "next/link";
import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { updateSellerProfileAction } from "@/features/sellers/actions";
import { SellerProfileForm } from "@/features/sellers/components/SellerProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata: Metadata = { title: "Seller Profile" };

export default async function DashboardProfilePage() {
  const { seller } = await requireSeller();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Seller Profile"
        description="How buyers see you across your listings."
        action={
          <Link href={`/@${seller.username}`} target="_blank" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            View Public Profile
          </Link>
        }
      />
      <SellerProfileForm
        mode="edit"
        accountType={seller.account_type}
        action={updateSellerProfileAction}
        defaultValues={{
          displayName: seller.display_name,
          username: seller.username,
          bio: seller.bio,
          city: seller.city,
          state: seller.state,
          websiteUrl: seller.website_url,
          instagramUrl: seller.instagram_url,
        }}
      />
    </div>
  );
}
