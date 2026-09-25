/**
 * Development fixtures: the synthetic Western New York dataset used for
 * local development and testing. Restored ONLY into a local Supabase stack by
 * `npm run fixtures:restore` (see scripts/db/restore-dev-fixtures.ts).
 *
 * Every person, business and street is fictional, emails use reserved test
 * domains, and no credential is stored here. These records are not the public
 * demo dataset (supabase/demo/) and must never be loaded into production.
 */

export const FIXTURE_DATASET = "dev-fixtures";

export type FixtureUser = { key: string; email: string; role: "admin" | "seller" | "buyer" };

export const FIXTURE_USERS: FixtureUser[] = [
  { key: "admin", email: "admin@dev.zella.test", role: "admin" },
  { key: "riley", email: "riley.seller@dev.zella.test", role: "seller" },
  { key: "maria", email: "maria.seller@dev.zella.test", role: "seller" },
  { key: "james", email: "james.seller@dev.zella.test", role: "seller" },
  { key: "group716", email: "716group.seller@dev.zella.test", role: "seller" },
  { key: "queencity", email: "queencity.seller@dev.zella.test", role: "seller" },
  { key: "wnyinvest", email: "wnyinvest.seller@dev.zella.test", role: "seller" },
  { key: "alex", email: "alex.buyer@dev.zella.test", role: "buyer" },
  { key: "jordan", email: "jordan.buyer@dev.zella.test", role: "buyer" },
  { key: "sam", email: "sam.buyer@dev.zella.test", role: "buyer" },
];

export type FixtureSeller = {
  key: string;
  userKey: string;
  accountType: "individual" | "business";
  displayName: string;
  username: string;
  city: string;
  bio: string;
};

export const FIXTURE_SELLERS: FixtureSeller[] = [
  { key: "riley", userKey: "riley", accountType: "individual", displayName: "Riley Fixture", username: "rileyproperties", city: "Buffalo", bio: "Fixture seller: a Buffalo homeowner and small investor with three properties on the West Side." },
  { key: "maria", userKey: "maria", accountType: "individual", displayName: "Maria Fixture", username: "maria.fixture.homes", city: "Amherst", bio: "Fixture seller: selling a family home in Amherst." },
  { key: "james", userKey: "james", accountType: "individual", displayName: "James Fixture", username: "jamesfixture", city: "Orchard Park", bio: "Fixture seller: renovates homes in the Southtowns." },
  { key: "group716", userKey: "group716", accountType: "business", displayName: "716 Fixture Group", username: "fixture716group", city: "Buffalo", bio: "Fixture business: a small group managing multi-family properties." },
  { key: "queencity", userKey: "queencity", accountType: "business", displayName: "Queen City Fixture Partners", username: "queencityfixture", city: "Williamsville", bio: "Fixture business: a family-owned property company in the Northtowns." },
  { key: "wnyinvest", userKey: "wnyinvest", accountType: "business", displayName: "WNY Fixture Investors", username: "wnyfixtureinvestors", city: "Cheektowaga", bio: "Fixture business: buys, renovates and sells homes in Erie County." },
];

export type FixtureProperty = {
  key: string;
  sellerKey: string;
  /** Fictional street line (no real house numbers on real streets). */
  addressLine1: string;
  city: string;
  postalCode: string;
  propertyType: "single_family" | "multi_family" | "condo" | "townhouse";
  listingStatus: "for_sale" | "coming_soon" | "under_contract" | "sold" | "draft" | "paused";
  addressVisibility: "full" | "city_zip" | "city_only";
  bedrooms: number;
  fullBathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  askingPriceCents: number | null;
  soldPriceCents?: number;
  pricingType: "asking_price" | "expected_range" | "price_undecided";
  expectedMin?: number;
  expectedMax?: number;
  title: string;
  description: string;
  imageCount: number;
  /** Days from restore time, when this property has an open house. */
  openHouseInDays?: number;
};

export const FIXTURE_PROPERTIES: FixtureProperty[] = [
  { key: "riley-colonial", sellerKey: "riley", addressLine1: "101 Fixture Lane", city: "Buffalo", postalCode: "14201", propertyType: "single_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 3, fullBathrooms: 2, squareFeet: 1850, yearBuilt: 1925, askingPriceCents: 24500000, pricingType: "asking_price", title: "Fixture Colonial Near the Village", description: "Fixture listing: a maintained colonial with hardwood floors, an updated kitchen, and a finished basement.", imageCount: 4, openHouseInDays: 3 },
  { key: "riley-two-family", sellerKey: "riley", addressLine1: "102 Fixture Lane", city: "Buffalo", postalCode: "14213", propertyType: "multi_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 6, fullBathrooms: 3, squareFeet: 2900, yearBuilt: 1910, askingPriceCents: 31500000, pricingType: "asking_price", title: "Fixture Two-Family", description: "Fixture listing: two renovated two-bedroom units with in-unit laundry.", imageCount: 5 },
  { key: "riley-coming-soon", sellerKey: "riley", addressLine1: "103 Fixture Lane", city: "Buffalo", postalCode: "14213", propertyType: "single_family", listingStatus: "coming_soon", addressVisibility: "city_zip", bedrooms: 4, fullBathrooms: 2, squareFeet: 2100, yearBuilt: 1932, askingPriceCents: null, pricingType: "expected_range", expectedMin: 21000000, expectedMax: 24000000, title: "Fixture Family Home (Coming Soon)", description: "Fixture listing: getting fresh paint and a new roof before it is listed.", imageCount: 6 },
  { key: "maria-ranch", sellerKey: "maria", addressLine1: "201 Sample Court", city: "Amherst", postalCode: "14226", propertyType: "single_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 4, fullBathrooms: 3, squareFeet: 2600, yearBuilt: 1998, askingPriceCents: 42500000, pricingType: "asking_price", title: "Fixture Amherst Ranch", description: "Fixture listing: open floor plan, granite counters, two-car garage.", imageCount: 4, openHouseInDays: 10 },
  { key: "maria-sold", sellerKey: "maria", addressLine1: "202 Sample Court", city: "Amherst", postalCode: "14228", propertyType: "single_family", listingStatus: "sold", addressVisibility: "full", bedrooms: 3, fullBathrooms: 2, squareFeet: 1780, yearBuilt: 1985, askingPriceCents: 28500000, soldPriceCents: 28700000, pricingType: "asking_price", title: "Fixture Split-Level (Sold)", description: "Fixture listing in the sold state.", imageCount: 5 },
  { key: "james-cape", sellerKey: "james", addressLine1: "301 Placeholder Road", city: "Orchard Park", postalCode: "14127", propertyType: "single_family", listingStatus: "under_contract", addressVisibility: "full", bedrooms: 3, fullBathrooms: 2, squareFeet: 1950, yearBuilt: 1965, askingPriceCents: 33500000, pricingType: "asking_price", title: "Fixture Renovated Cape", description: "Fixture listing in the under-contract state.", imageCount: 6 },
  { key: "james-colonial", sellerKey: "james", addressLine1: "302 Placeholder Road", city: "Orchard Park", postalCode: "14127", propertyType: "single_family", listingStatus: "coming_soon", addressVisibility: "city_only", bedrooms: 4, fullBathrooms: 3, squareFeet: 2400, yearBuilt: 2005, askingPriceCents: null, pricingType: "price_undecided", title: "Fixture Colonial (Coming Soon)", description: "Fixture listing with the price to be announced.", imageCount: 4 },
  { key: "james-starter", sellerKey: "james", addressLine1: "303 Placeholder Road", city: "Hamburg", postalCode: "14075", propertyType: "single_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 3, fullBathrooms: 1, squareFeet: 1400, yearBuilt: 1955, askingPriceCents: 19900000, pricingType: "asking_price", title: "Fixture Starter Home", description: "Fixture listing: fenced backyard and detached garage.", imageCount: 5 },
  { key: "group716-fourplex", sellerKey: "group716", addressLine1: "401 Example Avenue", city: "West Seneca", postalCode: "14224", propertyType: "multi_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 8, fullBathrooms: 4, squareFeet: 3600, yearBuilt: 1968, askingPriceCents: 45000000, pricingType: "asking_price", title: "Fixture Four-Unit Building", description: "Fixture listing: four units with separate utilities.", imageCount: 6, openHouseInDays: 17 },
  { key: "group716-two-family", sellerKey: "group716", addressLine1: "402 Example Avenue", city: "Cheektowaga", postalCode: "14225", propertyType: "multi_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 4, fullBathrooms: 2, squareFeet: 2200, yearBuilt: 1958, askingPriceCents: 22500000, pricingType: "asking_price", title: "Fixture Brick Two-Family", description: "Fixture listing with long-term tenants.", imageCount: 4 },
  { key: "group716-paused", sellerKey: "group716", addressLine1: "403 Example Avenue", city: "Cheektowaga", postalCode: "14227", propertyType: "single_family", listingStatus: "paused", addressVisibility: "full", bedrooms: 3, fullBathrooms: 2, squareFeet: 1600, yearBuilt: 1975, askingPriceCents: 21500000, pricingType: "asking_price", title: "Fixture Ranch (Paused)", description: "Fixture listing in the paused state.", imageCount: 5 },
  { key: "queencity-condo", sellerKey: "queencity", addressLine1: "501 Test Terrace", city: "Williamsville", postalCode: "14221", propertyType: "condo", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 2, fullBathrooms: 2, squareFeet: 1350, yearBuilt: 2012, askingPriceCents: 27500000, pricingType: "asking_price", title: "Fixture Condo", description: "Fixture listing in an association with a clubhouse.", imageCount: 6 },
  { key: "queencity-estate", sellerKey: "queencity", addressLine1: "502 Test Terrace", city: "Williamsville", postalCode: "14221", propertyType: "single_family", listingStatus: "coming_soon", addressVisibility: "city_zip", bedrooms: 4, fullBathrooms: 3, squareFeet: 2800, yearBuilt: 2001, askingPriceCents: null, pricingType: "expected_range", expectedMin: 47000000, expectedMax: 51000000, title: "Fixture Estate (Coming Soon)", description: "Fixture listing with a large backyard.", imageCount: 4 },
  { key: "queencity-bungalow", sellerKey: "queencity", addressLine1: "503 Test Terrace", city: "Tonawanda", postalCode: "14150", propertyType: "single_family", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 3, fullBathrooms: 1, squareFeet: 1500, yearBuilt: 1948, askingPriceCents: 18900000, pricingType: "asking_price", title: "Fixture Bungalow", description: "Fixture listing with a covered front porch.", imageCount: 5 },
  { key: "wnyinvest-townhouse", sellerKey: "wnyinvest", addressLine1: "601 Mock Street", city: "Cheektowaga", postalCode: "14224", propertyType: "townhouse", listingStatus: "for_sale", addressVisibility: "full", bedrooms: 3, fullBathrooms: 2, squareFeet: 1700, yearBuilt: 2015, askingPriceCents: 25900000, pricingType: "asking_price", title: "Fixture Townhouse", description: "Fixture listing: end unit with an attached garage.", imageCount: 6 },
  { key: "wnyinvest-draft", sellerKey: "wnyinvest", addressLine1: "602 Mock Street", city: "Lancaster", postalCode: "14086", propertyType: "single_family", listingStatus: "draft", addressVisibility: "full", bedrooms: 3, fullBathrooms: 2, squareFeet: 1900, yearBuilt: 1988, askingPriceCents: 26500000, pricingType: "asking_price", title: "Fixture Draft Listing", description: "Fixture listing that is still a draft.", imageCount: 4 },
];

export const FIXTURE_GUEST_RSVPS = [
  { key: "taylor", firstName: "Taylor", lastName: "Guest", email: "taylor.guest@example.test" },
  { key: "morgan", firstName: "Morgan", lastName: "Guest", email: "morgan.guest@example.test" },
];

export const FIXTURE_INQUIRIES = [
  { key: "showing", propertyKey: "riley-colonial", buyerKey: "alex", type: "showing_request", stage: "pre_approved", message: "Could I see this home this weekend?" },
  { key: "roof", propertyKey: "maria-ranch", buyerKey: "jordan", type: "question", stage: "just_starting", message: "Has the roof been replaced?" },
  { key: "cash", propertyKey: "group716-fourplex", buyerKey: null, type: "offer_interest", stage: "cash_buyer", message: "Interested in a cash offer." },
  { key: "hoa", propertyKey: "queencity-condo", buyerKey: "sam", type: "more_information", stage: "planning_to_get_pre_approved", message: "Can you share the HOA documents?" },
] as const;

/** Buyer index → seller/property index follows/saves. */
export const FIXTURE_FOLLOWS = [
  { buyerKey: "alex", sellerKey: "riley", propertyKey: "riley-colonial" },
  { buyerKey: "jordan", sellerKey: "maria", propertyKey: "riley-two-family" },
  { buyerKey: "sam", sellerKey: "james", propertyKey: "riley-coming-soon" },
];

export const FIXTURE_REPORT = {
  propertyKey: "riley-two-family",
  reporterEmail: "concerned.neighbor@example.test",
  reason: "incorrect_information",
  description: "The square footage listed seems higher than the county record.",
} as const;

export const FIXTURE_FEATURE_PICK_EVERY = 3;
