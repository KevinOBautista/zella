import { z } from "zod";
import { buildOpenHouseTimes, groupLabelsFor, type OpenHouseTemplate } from "./dates";

/**
 * Validation for the curated public demo dataset and its photo manifest.
 * The photo gate (requirePhotos) blocks production seeding until every
 * property has a coherent, complete, properly sourced gallery.
 */

export const REQUIRED_ROOMS = ["exterior_front", "living_room", "kitchen", "bedroom", "bathroom"] as const;
export const OPTIONAL_ROOMS = ["exterior_other", "backyard", "porch", "dining_room", "additional_bedroom", "basement", "other"] as const;
export const ROOMS = [...REQUIRED_ROOMS, ...OPTIONAL_ROOMS] as const;
export const MIN_PHOTOS_PER_PROPERTY = 5;
export const AI_ATTRIBUTION = "AI-generated illustrative image";
/** Hamming distance (of a 64-bit dHash) at or below which two images count as the same photo. */
export const NEAR_DUPLICATE_DISTANCE = 6;

/** Listing portals, MLS and brokerage sites are never acceptable photo sources. */
const BANNED_SOURCE_HOSTS = [
  "zillow.com", "redfin.com", "realtor.com", "trulia.com", "homes.com", "movoto.com", "remax.com",
  "coldwellbanker.com", "kw.com", "century21.com", "compass.com", "howardhanna.com", "nythomes.com",
];

const username = z.string().regex(/^[a-z0-9_.]{3,30}$/);
const cents = z.number().int().positive();

const sellerSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9-]+$/),
    accountType: z.enum(["individual", "business"]),
    displayName: z.string().min(1).max(80),
    username,
    initials: z.string().regex(/^[A-Z]{1,2}$/),
    bio: z.string().min(1).max(1000),
    city: z.string().min(1),
    state: z.literal("NY"),
  })
  .strict();

const pricingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("asking_price"), askingPriceCents: cents }),
  z.object({ type: z.literal("expected_range"), minCents: cents, maxCents: cents }),
  z.object({ type: z.literal("price_undecided") }),
]);

const propertySchema = z
  .object({
    key: z.string().regex(/^[a-z0-9-]+$/),
    sellerKey: z.string(),
    slug: z.string().regex(/^demo-[a-z0-9-]+$/),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(5000),
    propertyType: z.enum(["single_family", "multi_family", "condo", "townhouse"]),
    listingStatus: z.enum(["for_sale", "coming_soon"]),
    city: z.string().min(1),
    postalCode: z.string().regex(/^14\d{3}$/),
    county: z.string().min(1),
    bedrooms: z.number().int().min(0).max(10),
    fullBathrooms: z.number().int().min(1).max(8),
    halfBathrooms: z.number().int().min(0).max(4),
    squareFeet: z.number().int().min(400).max(8000),
    lotSize: z.number().positive().optional(),
    lotSizeUnit: z.enum(["sqft", "acres"]).optional(),
    yearBuilt: z.number().int().min(1850).max(2026),
    stories: z.number().int().min(1).max(4),
    garageSpaces: z.number().int().min(0).max(4),
    parkingSpaces: z.number().int().min(0).max(8),
    basementType: z.string().optional(),
    heatingType: z.string().optional(),
    coolingType: z.string().optional(),
    parkingType: z.string().optional(),
    hoaFeeCents: cents.optional(),
    propertyTaxesAnnualCents: cents,
    pricing: pricingSchema,
    features: z.array(z.string().regex(/^[a-z0-9-]+$/)),
    publishedDaysAgo: z.number().int().min(0).max(60),
    /** What the gallery must show, used when sourcing photos. */
    photoBrief: z.string().min(1),
  })
  .strict();

const templateSchema = z.object({
  dayOffset: z.number().int(),
  startLocal: z.string(),
  durationMinutes: z.number().int(),
});

const openHouseSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9-]+$/),
    propertyKey: z.string(),
    template: templateSchema,
    registrationType: z.enum(["none", "optional", "required"]),
    instructions: z.string().max(1000).nullable(),
  })
  .strict();

export const demoDatasetSchema = z.object({
  sellers: z.array(sellerSchema),
  properties: z.array(propertySchema),
  openHouses: z.array(openHouseSchema),
});

const imageBase = {
  propertyKey: z.string(),
  /** Identifies the single real-world shoot (or generated house) the photo belongs to. */
  setId: z.string().min(1),
  file: z.string().regex(/^[a-z0-9-]+\/[a-z0-9_.-]+\.webp$/),
  room: z.enum(ROOMS),
  order: z.number().int().min(0),
  isCover: z.boolean(),
  alt: z.string().min(8).max(300),
  width: z.number().int().min(1200),
  height: z.number().int().min(800),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  dhash: z.string().regex(/^[0-9a-f]{16}$/),
  notes: z.string().optional(),
};

export const manifestImageSchema = z.discriminatedUnion("sourceType", [
  z.object({
    ...imageBase,
    sourceType: z.literal("ai_generated"),
    generator: z.string().min(1),
    attributionText: z.string(),
    locationVerified: z.boolean(),
  }),
  z.object({
    ...imageBase,
    sourceType: z.literal("licensed_photo"),
    sourceUrl: z.string().url(),
    license: z.string().min(1),
    attributionText: z.string().min(1),
    locationVerified: z.boolean(),
  }),
  z.object({
    ...imageBase,
    sourceType: z.literal("permission_granted"),
    sourceUrl: z.string().url().optional(),
    permissionRef: z.string().min(1),
    attributionText: z.string().min(1),
    locationVerified: z.boolean(),
  }),
]);

export const photoManifestSchema = z.object({ images: z.array(manifestImageSchema) });

export type DemoDataset = z.infer<typeof demoDatasetSchema>;
export type DemoProperty = DemoDataset["properties"][number];
export type ManifestImage = z.infer<typeof manifestImageSchema>;
export type PhotoManifest = z.infer<typeof photoManifestSchema>;

export type PhotoGap = { propertyKey: string; photoCount: number; missingRooms: string[] };

export type ValidationResult = {
  errors: string[];
  warnings: string[];
  photoGaps: PhotoGap[];
  groupLabels: string[];
};

export function hammingDistance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

function duplicates<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const dup = new Set<T>();
  for (const v of values) (seen.has(v) ? dup : seen).add(v);
  return [...dup];
}

function isBannedHost(host: string): boolean {
  return BANNED_SOURCE_HOSTS.some((b) => host === b || host.endsWith(`.${b}`)) || /(^|\.)mls[a-z0-9-]*\./.test(host);
}

export function validateDemoDataset(
  rawDataset: unknown,
  rawManifest: unknown,
  opts: { requirePhotos: boolean; referenceDate?: string; knownFeatureSlugs?: string[] },
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsedDataset = demoDatasetSchema.safeParse(rawDataset);
  if (!parsedDataset.success) {
    return { errors: parsedDataset.error.issues.map((i) => `dataset ${i.path.join(".")}: ${i.message}`), warnings, photoGaps: [], groupLabels: [] };
  }
  const parsedManifest = photoManifestSchema.safeParse(rawManifest);
  if (!parsedManifest.success) {
    return { errors: parsedManifest.error.issues.map((i) => `manifest ${i.path.join(".")}: ${i.message}`), warnings, photoGaps: [], groupLabels: [] };
  }
  const dataset = parsedDataset.data;
  const manifest = parsedManifest.data;

  if (dataset.sellers.length !== 3) errors.push(`expected 3 demo sellers, found ${dataset.sellers.length}`);
  if (dataset.properties.length < 6 || dataset.properties.length > 10) errors.push(`expected about 8 demo properties, found ${dataset.properties.length}`);
  if (dataset.openHouses.length < 3 || dataset.openHouses.length > 5) errors.push(`expected about 4 demo open houses, found ${dataset.openHouses.length}`);

  const uniqueChecks: [string, string[]][] = [
    ["seller key", dataset.sellers.map((s) => s.key)],
    ["username", dataset.sellers.map((s) => s.username)],
    ["property key", dataset.properties.map((p) => p.key)],
    ["slug", dataset.properties.map((p) => p.slug)],
    ["open house key", dataset.openHouses.map((o) => o.key)],
  ];
  for (const [label, values] of uniqueChecks) {
    for (const d of duplicates(values)) errors.push(`duplicate ${label} "${d}"`);
  }

  for (const s of dataset.sellers) {
    if (!/\bdemo\b/i.test(s.bio)) errors.push(`seller ${s.key}: bio must say it is a demo profile`);
    if (/@|https?:|www\.|\d{3}[-. ]\d{3}[-. ]\d{4}/.test(s.bio)) errors.push(`seller ${s.key}: bio must not contain contact details`);
    if (/verified|followers|reviews|sold over|customers|years of experience|award/i.test(s.bio)) {
      errors.push(`seller ${s.key}: bio must not make activity or verification claims`);
    }
  }

  const sellerKeys = new Set(dataset.sellers.map((s) => s.key));
  const statuses = new Set<string>();
  for (const p of dataset.properties) {
    statuses.add(p.listingStatus);
    if (!sellerKeys.has(p.sellerKey)) errors.push(`property ${p.key}: unknown seller "${p.sellerKey}"`);
    if (p.pricing.type === "expected_range" && p.pricing.minCents >= p.pricing.maxCents) errors.push(`property ${p.key}: price range is inverted`);
    if (p.listingStatus === "for_sale" && p.pricing.type !== "asking_price") errors.push(`property ${p.key}: For Sale listings need an asking price`);
    if (p.lotSize !== undefined && !p.lotSizeUnit) errors.push(`property ${p.key}: lotSize needs lotSizeUnit`);
    if (opts.knownFeatureSlugs) {
      for (const f of p.features) if (!opts.knownFeatureSlugs.includes(f)) errors.push(`property ${p.key}: unknown feature "${f}"`);
    }
  }
  if (!statuses.has("for_sale") || !statuses.has("coming_soon")) errors.push("dataset must mix For Sale and Coming Soon listings");

  const propertyKeys = new Set(dataset.properties.map((p) => p.key));
  for (const o of dataset.openHouses) {
    if (!propertyKeys.has(o.propertyKey)) errors.push(`open house ${o.key}: unknown property "${o.propertyKey}"`);
    try {
      buildOpenHouseTimes(opts.referenceDate ?? "2026-09-16", o.template as OpenHouseTemplate);
    } catch (err) {
      errors.push(`open house ${o.key}: ${(err as Error).message}`);
    }
  }

  let groupLabels: string[] = [];
  if (opts.referenceDate) {
    try {
      groupLabels = groupLabelsFor(opts.referenceDate, dataset.openHouses.map((o) => o.template as OpenHouseTemplate));
      for (const needed of ["This Week", "Later"]) {
        if (!groupLabels.includes(needed)) {
          warnings.push(`reference date ${opts.referenceDate} produces no "${needed}" events; choose a Monday–Wednesday reference date`);
        }
      }
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  // --- Photos ----------------------------------------------------------------
  for (const d of duplicates(manifest.images.map((i) => i.file))) errors.push(`manifest: duplicate file "${d}"`);
  for (const d of duplicates(manifest.images.map((i) => i.sha256))) errors.push(`manifest: duplicate image content ${d.slice(0, 12)}`);

  const setOwners = new Map<string, string>();
  for (const img of manifest.images) {
    if (!propertyKeys.has(img.propertyKey)) errors.push(`manifest ${img.file}: unknown property "${img.propertyKey}"`);
    if (!img.file.startsWith(`${img.propertyKey}/`)) errors.push(`manifest ${img.file}: file must live under ${img.propertyKey}/`);
    const owner = setOwners.get(img.setId);
    if (owner && owner !== img.propertyKey) errors.push(`manifest: photo set "${img.setId}" is used by more than one property`);
    setOwners.set(img.setId, img.propertyKey);

    if (img.sourceType === "ai_generated") {
      if (img.attributionText !== AI_ATTRIBUTION) errors.push(`manifest ${img.file}: attributionText must be "${AI_ATTRIBUTION}"`);
      if (img.locationVerified) errors.push(`manifest ${img.file}: locationVerified cannot be true for AI-generated images`);
    } else if (img.sourceUrl) {
      const host = new URL(img.sourceUrl).hostname.toLowerCase();
      if (isBannedHost(host)) errors.push(`manifest ${img.file}: ${host} is not an allowed source`);
    }
  }

  const photoGaps: PhotoGap[] = [];
  for (const p of dataset.properties) {
    const imgs = manifest.images.filter((i) => i.propertyKey === p.key);
    const distinct: typeof imgs = [];
    for (const img of imgs) {
      const twin = distinct.find((d) => d.sha256 === img.sha256 || hammingDistance(d.dhash, img.dhash) <= NEAR_DUPLICATE_DISTANCE);
      if (twin) {
        if (twin.sha256 !== img.sha256) errors.push(`property ${p.key}: ${img.file} is a near-duplicate of ${twin.file}`);
        continue;
      }
      distinct.push(img);
    }
    const rooms = new Set<string>(distinct.map((i) => i.room));
    const missingRooms = REQUIRED_ROOMS.filter((r) => !rooms.has(r));
    if (distinct.length < MIN_PHOTOS_PER_PROPERTY || missingRooms.length) {
      photoGaps.push({ propertyKey: p.key, photoCount: distinct.length, missingRooms });
    }
    if (imgs.length === 0) continue;

    if (new Set(imgs.map((i) => i.setId)).size > 1) errors.push(`property ${p.key}: all photos must come from a single photo set`);
    if (new Set(imgs.map((i) => i.sourceType)).size > 1) errors.push(`property ${p.key}: all photos must share one source type`);
    const covers = imgs.filter((i) => i.isCover);
    if (covers.length !== 1) errors.push(`property ${p.key}: needs exactly one cover image`);
    else if (covers[0]!.room !== "exterior_front") errors.push(`property ${p.key}: the cover must be the exterior_front photo`);
    const orders = imgs.map((i) => i.order).sort((a, b) => a - b);
    if (orders.some((o, idx) => o !== idx)) errors.push(`property ${p.key}: display orders must be 0..${imgs.length - 1}`);
  }

  if (opts.requirePhotos) {
    for (const gap of photoGaps) {
      errors.push(
        `property ${gap.propertyKey}: needs at least ${MIN_PHOTOS_PER_PROPERTY} photos of one house covering ${REQUIRED_ROOMS.join(", ")} ` +
          `(has ${gap.photoCount} distinct${gap.missingRooms.length ? `, missing ${gap.missingRooms.join(", ")}` : ""})`,
      );
    }
  }

  return { errors, warnings, photoGaps, groupLabels };
}
