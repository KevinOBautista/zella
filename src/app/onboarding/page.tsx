import { redirect } from "next/navigation";
import { getSellerProfile, requireVerifiedUser } from "@/lib/auth/session";
import { MANAGE_PROPERTIES_PATH } from "@/lib/seller-routing";

/**
 * Account-aware entry point for every "sell" CTA. The layout already
 * requires a verified session, so a guest arrives here only after signing
 * in. Existing sellers never re-onboard; everyone else continues into the
 * existing seller setup steps on the same account.
 */
export default async function OnboardingEntryPage() {
  const user = await requireVerifiedUser();
  const seller = await getSellerProfile(user.id);
  redirect(seller ? MANAGE_PROPERTIES_PATH : "/onboarding/seller-type");
}
