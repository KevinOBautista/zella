import Link from "next/link";
import type { Metadata } from "next";
import { requireVerifiedUser, getSellerProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const user = await requireVerifiedUser();
  const seller = await getSellerProfile(user.id);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl">My Account</h1>
      <Card className="p-5">
        <p className="text-sm text-[var(--color-muted)]">Email</p>
        <p className="font-medium">{user.email}</p>
        {(profile?.first_name || profile?.last_name) && (
          <>
            <p className="mt-3 text-sm text-[var(--color-muted)]">Name</p>
            <p className="font-medium">
              {profile?.first_name} {profile?.last_name}
            </p>
          </>
        )}
      </Card>

      {seller ? (
        <Link href="/dashboard" className={buttonVariants()}>
          Go to Seller Dashboard
        </Link>
      ) : (
        <Link href="/onboarding/intent" className={buttonVariants()}>
          Become a Seller
        </Link>
      )}
    </div>
  );
}
