/**
 * Builds the read-only data used by fixture mode (Vercel previews and
 * `NEXT_PUBLIC_DATA_MODE=fixtures` locally) from the public demo dataset.
 * No development fixtures, accounts or private data are included.
 *
 *   npm run preview:fixtures [-- --reference-date=YYYY-MM-DD]
 *
 * Runs automatically before `next build` when the build is in fixture mode.
 * Demo photos, when present, are copied to public/preview-fixtures/.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveDataMode } from "../../src/config/runtime";
import type { FixtureData, FixtureRow } from "../../src/lib/preview-fixtures/types";
import { demoDataset, DEMO_DATASET_ID } from "../../supabase/demo/wny-demo-2026/dataset";
import { todayInZone } from "../demo/dates";
import { buildDemoPayload, demoStoragePath } from "../demo/payload";
import { photoManifestSchema, type DemoDataset, type PhotoManifest } from "../demo/schema";

const ROOT = path.resolve(import.meta.dirname, "../..");
export const GENERATED_PATH = path.join(ROOT, "src/lib/preview-fixtures/generated.json");
const DEMO_DIR = path.join(ROOT, "supabase/demo", DEMO_DATASET_ID);
const PUBLIC_DIR = path.join(ROOT, "public/preview-fixtures");

export function readFeatureCatalog(): { slug: string; name: string; category: string }[] {
  const sql = readFileSync(path.join(ROOT, "supabase/migrations/20260913000011_seed_features.sql"), "utf8");
  return [...sql.matchAll(/\('([^']+)', '([^']+)', '([^']+)'\)/g)].map((m) => ({ name: m[1]!, category: m[2]!, slug: m[3]! }));
}

export function buildFixtureData(dataset: DemoDataset, manifest: PhotoManifest, referenceDate: string, now: Date): FixtureData {
  const payload = buildDemoPayload(dataset, manifest, referenceDate);
  const features = readFeatureCatalog();
  const createdAt = new Date(`${referenceDate}T12:00:00Z`).toISOString();
  const nowIso = now.toISOString();

  const upcoming = payload.open_houses.filter((o) => o.ends_at > nowIso);
  const imagesFor = (propertyId: string) =>
    payload.property_images.filter((i) => i.property_id === propertyId).sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.display_order - b.display_order);

  const sellers = new Map(payload.sellers.map((s) => [s.id, s]));

  const properties: FixtureRow[] = payload.properties.map((p) => {
    const seller = sellers.get(p.seller_id)!;
    const images = imagesFor(p.id);
    return {
      ...p,
      seed_key: undefined,
      display_address_line_1: null,
      display_address_line_2: null,
      display_postal_code: p.postal_code,
      display_latitude: null,
      display_longitude: null,
      display_line: `${p.city}, ${p.state} ${p.postal_code}`,
      video_url: null,
      virtual_tour_url: null,
      sold_price_cents: null,
      created_at: createdAt,
      cover_image_path: images[0]?.storage_path ?? null,
      photo_count: images.length,
      has_upcoming_open_house: upcoming.some((o) => o.property_id === p.id),
      seller_username: seller.username,
      seller_display_name: seller.display_name,
      seller_profile_image_path: null,
      is_demo: true,
    };
  });

  const sellerRows: FixtureRow[] = payload.sellers.map((s) => ({
    id: s.id,
    account_type: s.account_type,
    display_name: s.display_name,
    username: s.username,
    profile_image_path: null,
    bio: s.bio,
    city: s.city,
    state: s.state,
    website_url: null,
    instagram_url: null,
    created_at: createdAt,
    follower_count: 0,
    for_sale_count: payload.properties.filter((p) => p.seller_id === s.id && p.listing_status === "for_sale").length,
    coming_soon_count: payload.properties.filter((p) => p.seller_id === s.id && p.listing_status === "coming_soon").length,
    has_upcoming_open_house: upcoming.some((o) => o.seller_id === s.id),
    is_demo: true,
  }));

  const openHouses: FixtureRow[] = payload.open_houses.map((o) => {
    const p = payload.properties.find((x) => x.id === o.property_id)!;
    const seller = sellers.get(o.seller_id)!;
    return {
      id: o.id,
      property_id: o.property_id,
      seller_id: o.seller_id,
      starts_at: o.starts_at,
      ends_at: o.ends_at,
      timezone: "America/New_York",
      registration_type: o.registration_type,
      instructions: o.instructions,
      host_type: o.host_type,
      display_address_line_1: null,
      city: p.city,
      state: p.state,
      display_postal_code: p.postal_code,
      asking_price_cents: p.asking_price_cents,
      cover_image_path: imagesFor(p.id)[0]?.storage_path ?? null,
      seller_username: seller.username,
      seller_display_name: seller.display_name,
      property_slug: p.slug,
      property_title: p.title,
      is_demo: true,
    };
  });

  const featureBySlug = new Map(features.map((f, i) => [f.slug, { ...f, id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}` }]));

  return {
    generatedFor: referenceDate,
    tables: {
      public_properties: properties.map(({ seed_key: _s, ...rest }) => rest),
      public_seller_profiles: sellerRows,
      public_open_houses: openHouses,
      public_property_images: payload.property_images.map(({ seed_key: _s, ...rest }) => rest),
      public_property_features: payload.property_features.flatMap((pf) => {
        const f = featureBySlug.get(pf.feature_slug);
        return f ? [{ property_id: pf.property_id, feature_id: f.id, name: f.name, category: f.category, slug: f.slug }] : [];
      }),
      public_property_custom_features: [],
      public_property_agents: [],
      features: [...featureBySlug.values()],
    },
  };
}

function copyPhotos(manifest: PhotoManifest) {
  rmSync(PUBLIC_DIR, { recursive: true, force: true });
  for (const img of manifest.images) {
    const from = path.join(DEMO_DIR, "images", img.file);
    if (!existsSync(from)) continue;
    const to = path.join(PUBLIC_DIR, demoStoragePath(img));
    mkdirSync(path.dirname(to), { recursive: true });
    cpSync(from, to);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  if (!force && resolveDataMode(process.env) !== "fixtures") {
    console.log("preview:fixtures skipped (not a fixture-mode build).");
    return;
  }
  const referenceDate = argv.find((a) => a.startsWith("--reference-date="))?.split("=")[1] ?? todayInZone(new Date());
  const manifest = photoManifestSchema.parse(JSON.parse(readFileSync(path.join(DEMO_DIR, "images/manifest.json"), "utf8")));
  const data = buildFixtureData(demoDataset, manifest, referenceDate, new Date());
  writeFileSync(GENERATED_PATH, `${JSON.stringify(data, null, 2)}\n`);
  copyPhotos(manifest);
  console.log(`Wrote preview fixtures for ${referenceDate} (${data.tables.public_properties?.length ?? 0} homes).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
