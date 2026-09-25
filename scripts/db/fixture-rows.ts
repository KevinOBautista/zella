import { stableId } from "../lib/ids";
import {
  FIXTURE_DATASET,
  FIXTURE_FEATURE_PICK_EVERY,
  FIXTURE_FOLLOWS,
  FIXTURE_GUEST_RSVPS,
  FIXTURE_INQUIRIES,
  FIXTURE_PROPERTIES,
  FIXTURE_REPORT,
  FIXTURE_SELLERS,
  FIXTURE_USERS,
} from "../../supabase/fixtures/dev/data";

const DAY = 86_400_000;
const id = (table: string, key: string) => stableId(undefined, FIXTURE_DATASET, table, key);

export function fixtureSlug(addressLine1: string, city: string) {
  return `${addressLine1} ${city} ny`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Every row the local fixture restore writes, with deterministic ids. */
export function buildFixtureRows(now: Date, featureSlugs: string[]) {
  const userId = (key: string) => id("user", key);
  const sellerId = (key: string) => id("seller", key);
  const propertyId = (key: string) => id("property", key);
  const buyerEmail = (key: string) => FIXTURE_USERS.find((u) => u.key === key)!.email;

  const users = FIXTURE_USERS.map((u) => ({ id: userId(u.key), email: u.email, role: u.role }));

  const sellers = FIXTURE_SELLERS.map((s) => ({
    id: sellerId(s.key),
    user_id: userId(s.userKey),
    account_type: s.accountType,
    display_name: s.displayName,
    username: s.username,
    city: s.city,
    state: "NY",
    bio: s.bio,
  }));

  const properties = FIXTURE_PROPERTIES.map((p, i) => ({
    id: propertyId(p.key),
    seller_id: sellerId(p.sellerKey),
    slug: p.listingStatus === "draft" ? null : fixtureSlug(p.addressLine1, p.city),
    address_line_1: p.addressLine1,
    city: p.city,
    state: "NY",
    postal_code: p.postalCode,
    county: "Erie",
    property_type: p.propertyType,
    listing_status: p.listingStatus,
    address_visibility: p.addressVisibility,
    bedrooms: p.bedrooms,
    full_bathrooms: p.fullBathrooms,
    square_feet: p.squareFeet,
    year_built: p.yearBuilt,
    pricing_type: p.pricingType,
    asking_price_cents: p.askingPriceCents,
    expected_price_min_cents: p.expectedMin ?? null,
    expected_price_max_cents: p.expectedMax ?? null,
    sold_price_cents: p.soldPriceCents ?? null,
    title: p.title,
    description: p.description,
    publish_acknowledged_at: p.listingStatus === "draft" ? null : new Date(now.getTime() - DAY * 30).toISOString(),
    published_at: p.listingStatus === "draft" ? null : new Date(now.getTime() - (FIXTURE_PROPERTIES.length - i) * DAY).toISOString(),
  }));

  const images = FIXTURE_PROPERTIES.flatMap((p) =>
    Array.from({ length: p.imageCount }, (_, n) => ({
      id: id("property_image", `${p.key}:${n}`),
      property_id: propertyId(p.key),
      storage_path: `${propertyId(p.key)}/fixture-${n}.webp`,
      display_order: n,
      is_cover: n === 0,
      /** Deterministic placeholder source (see supabase/fixtures/dev/README.md). */
      placeholder_seed: `${fixtureSlug(p.addressLine1, p.city)}-${n}`,
    })),
  );

  const propertyFeatures = FIXTURE_PROPERTIES.flatMap((p, i) =>
    featureSlugs
      .filter((_, idx) => (idx + i) % FIXTURE_FEATURE_PICK_EVERY === 0)
      .slice(0, 4)
      .map((slug) => ({ property_id: propertyId(p.key), feature_slug: slug })),
  );

  const openHouses = FIXTURE_PROPERTIES.filter((p) => p.openHouseInDays !== undefined && p.addressVisibility === "full").map((p) => {
    const start = new Date(now.getTime() + p.openHouseInDays! * DAY);
    start.setUTCHours(17, 0, 0, 0);
    return {
      id: id("open_house", p.key),
      property_id: propertyId(p.key),
      seller_id: sellerId(p.sellerKey),
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 3 * 3_600_000).toISOString(),
      registration_type: "optional",
      instructions: "Please use the driveway for parking.",
      host_type: "seller",
      status: "scheduled",
    };
  });

  const rsvps = openHouses.flatMap((oh) => [
    ...FIXTURE_GUEST_RSVPS.map((g) => ({
      id: id("rsvp", `${oh.id}:${g.key}`),
      open_house_id: oh.id,
      user_id: null as string | null,
      first_name: g.firstName,
      last_name: g.lastName,
      email: g.email,
      party_size: 2,
      agent_status: "not_working_with_agent",
    })),
    {
      id: id("rsvp", `${oh.id}:alex`),
      open_house_id: oh.id,
      user_id: userId("alex"),
      first_name: "Alex",
      last_name: "Buyer",
      email: buyerEmail("alex"),
      party_size: 1,
      agent_status: "prefer_not_to_say",
    },
  ]);

  const follows = FIXTURE_FOLLOWS.map((f) => ({ id: id("follow", f.buyerKey), seller_id: sellerId(f.sellerKey), follower_user_id: userId(f.buyerKey) }));
  const saves = FIXTURE_FOLLOWS.map((f) => ({ id: id("save", f.buyerKey), property_id: propertyId(f.propertyKey), user_id: userId(f.buyerKey) }));

  const inquiries = FIXTURE_INQUIRIES.map((q) => {
    const property = FIXTURE_PROPERTIES.find((p) => p.key === q.propertyKey)!;
    return {
      id: id("inquiry", q.key),
      property_id: propertyId(q.propertyKey),
      seller_id: sellerId(property.sellerKey),
      user_id: q.buyerKey ? userId(q.buyerKey) : null,
      first_name: q.buyerKey ? "Buyer" : "Guest",
      last_name: q.buyerKey ?? "Visitor",
      email: q.buyerKey ? buyerEmail(q.buyerKey) : "guest.buyer@example.test",
      preferred_contact_method: "email",
      inquiry_type: q.type,
      buying_stage: q.stage,
      agent_status: "prefer_not_to_say",
      message: q.message,
      lead_status: q.key === "showing" ? "contacted" : "new",
    };
  });

  const firstInquiry = inquiries[0]!;
  const leadActivity = [
    { id: id("lead_activity", "showing"), inquiry_id: firstInquiry.id, seller_id: firstInquiry.seller_id, activity_type: "status_changed", previous_value: "new", new_value: "contacted" },
  ];
  const leadNotes = [
    { id: id("lead_note", "showing"), inquiry_id: firstInquiry.id, seller_id: firstInquiry.seller_id, note: "Called and left a voicemail; following up Thursday." },
  ];

  const reports = [
    {
      id: id("report", "sqft"),
      property_id: propertyId(FIXTURE_REPORT.propertyKey),
      reporter_email: FIXTURE_REPORT.reporterEmail,
      reason: FIXTURE_REPORT.reason,
      description: FIXTURE_REPORT.description,
    },
  ];

  return { users, sellers, properties, images, propertyFeatures, openHouses, rsvps, follows, saves, inquiries, leadActivity, leadNotes, reports };
}
