import { getViewer } from "@/lib/auth/viewer";
import { sellerCta } from "@/lib/seller-routing";
import { getNewlyListedProperties, getSavedPropertyIds } from "@/features/properties/queries";
import { getFeaturedSellers, getFollowedSellerIds } from "@/features/sellers/queries";
import { getUpcomingOpenHouses } from "@/features/open-houses/queries";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { LandingNav } from "@/features/landing/components/LandingNav";
import { Hero } from "@/features/landing/components/Hero";
import { SellerIntro } from "@/features/landing/components/SellerIntro";
import { FeaturedHomes } from "@/features/landing/components/FeaturedHomes";
import { OpenHouses } from "@/features/landing/components/OpenHouses";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { SellerCta } from "@/features/landing/components/SellerCta";

/**
 * One homepage, three states (guest / buyer / seller) driven by the real
 * session + seller_profiles row via getViewer(). Signed-in users are never
 * redirected away; sellers keep every buyer capability.
 */
export default async function HomePage() {
  const { user, state, initial } = await getViewer();
  const isLoggedIn = Boolean(user);

  const [listings, openHouses, sellers, savedIds, followedIds, unreadCount] = await Promise.all([
    getNewlyListedProperties(4),
    getUpcomingOpenHouses(3),
    getFeaturedSellers(1),
    user ? getSavedPropertyIds(user.id) : Promise.resolve(new Set<string>()),
    user ? getFollowedSellerIds(user.id) : Promise.resolve(new Set<string>()),
    user ? getUnreadNotificationCount(user.id) : Promise.resolve(0),
  ]);

  const cta = sellerCta(state);
  const spotlightSeller = sellers[0] ?? null;

  return (
    <>
      <LandingNav state={state} initial={initial} cta={cta} unreadCount={unreadCount} />
      <main>
        <Hero cta={{ ...cta, label: state === "guest" ? "List Your Property" : cta.label }} />
        <SellerIntro
          seller={spotlightSeller}
          isFollowing={spotlightSeller ? followedIds.has(spotlightSeller.id) : false}
          isLoggedIn={isLoggedIn}
        />
        <FeaturedHomes listings={listings} savedIds={[...savedIds]} isLoggedIn={isLoggedIn} />
        <OpenHouses openHouses={openHouses} />
        {state === "guest" && <HowItWorks />}
        <SellerCta state={state} />
      </main>
    </>
  );
}
