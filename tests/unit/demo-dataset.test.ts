// @vitest-environment node
import { describe, expect, it } from "vitest";
import { stableId } from "@scripts/lib/ids";
import { validateDemoDataset } from "@scripts/demo/schema";
import { fullManifest } from "@tests/helpers/demo-manifest";
import { buildDemoPayload, demoStoragePath } from "@scripts/demo/payload";
import { demoDataset as realDataset, DEMO_DATASET_ID } from "../../supabase/demo/wny-demo-2026/dataset";

const dataset = realDataset;

describe("stableId", () => {
  it("matches the RFC 4122 v5 test vector", () => {
    expect(stableId("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "www.example.com")).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });

  it("is deterministic and input-sensitive", () => {
    expect(stableId(undefined, "a", "b")).toBe(stableId(undefined, "a", "b"));
    expect(stableId(undefined, "a", "b")).not.toBe(stableId(undefined, "a", "c"));
    expect(stableId(undefined, "ab", "c")).not.toBe(stableId(undefined, "a", "bc"));
  });
});

describe("the WNY demo dataset", () => {
  it("has 3 sellers, about 8 properties and about 4 open houses", () => {
    expect(dataset.sellers).toHaveLength(3);
    expect(dataset.properties).toHaveLength(8);
    expect(dataset.openHouses).toHaveLength(4);
  });

  it("is structurally valid apart from the photo gate", () => {
    const result = validateDemoDataset(dataset, { images: [] }, { requirePhotos: false });
    expect(result.errors).toEqual([]);
    expect(result.photoGaps).toHaveLength(8);
  });

  it("mixes For Sale and Coming Soon listings", () => {
    const statuses = new Set(dataset.properties.map((p) => p.listingStatus));
    expect(statuses).toEqual(new Set(["for_sale", "coming_soon"]));
  });

  it("identifies every seller as a demo profile without contact details or claims", () => {
    for (const s of dataset.sellers) {
      expect(s.bio.toLowerCase()).toContain("demo");
      expect(s.bio).not.toMatch(/@|https?:|www\.|\d{3}[-. ]\d{3}[-. ]\d{4}/);
      expect(s.bio.toLowerCase()).not.toMatch(/verified|followers|reviews|sold over|customers|years of experience|award/);
    }
  });

  it("never includes a street address", () => {
    for (const p of dataset.properties) {
      expect(p).not.toHaveProperty("addressLine1");
      expect(`${p.title} ${p.description}`).not.toMatch(/\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Ct|Pl)\b/);
    }
  });

  it("uses Buffalo and Western New York communities", () => {
    const allowed = ["Buffalo", "Kenmore", "Tonawanda", "Amherst", "Williamsville", "Orchard Park", "Hamburg", "Cheektowaga", "West Seneca", "Lancaster", "East Aurora", "Snyder", "Clarence", "Grand Island"];
    for (const p of dataset.properties) expect(allowed).toContain(p.city);
  });

  it("produces This Week and Later events from the recommended reference date", () => {
    const result = validateDemoDataset(dataset, { images: [] }, { requirePhotos: false, referenceDate: "2026-09-16" });
    expect(result.groupLabels).toEqual(expect.arrayContaining(["This Week", "Later"]));
    expect(result.warnings).toEqual([]);
  });

  it("warns when a reference date cannot show This Week", () => {
    const result = validateDemoDataset(dataset, { images: [] }, { requirePhotos: false, referenceDate: "2026-09-19" });
    expect(result.warnings.join(" ")).toMatch(/This Week/);
  });
});

describe("photo gate", () => {
  it("blocks seeding while galleries are incomplete", () => {
    const result = validateDemoDataset(dataset, { images: [] }, { requirePhotos: true });
    expect(result.errors.join("\n")).toMatch(/at least 5 photos/);
  });

  it("passes with five distinct required rooms per property", () => {
    expect(validateDemoDataset(dataset, fullManifest(dataset), { requirePhotos: true }).errors).toEqual([]);
    expect(validateDemoDataset(dataset, fullManifest(dataset, "licensed_photo"), { requirePhotos: true }).errors).toEqual([]);
  });

  it("rejects a gallery missing a required room", () => {
    const manifest = fullManifest(dataset);
    const key = dataset.properties[0]!.key;
    manifest.images = manifest.images.filter((i) => !(i.propertyKey === key && i.room === "bathroom"));
    const { errors, photoGaps } = validateDemoDataset(dataset, manifest, { requirePhotos: true });
    expect(errors.join("\n")).toMatch(/bathroom/);
    expect(photoGaps.find((g) => g.propertyKey === key)?.missingRooms).toEqual(["bathroom"]);
  });

  it("does not count duplicates or near-duplicate crops as separate photos", () => {
    const manifest = fullManifest(dataset);
    const key = dataset.properties[1]!.key;
    const imgs = manifest.images.filter((i) => i.propertyKey === key);
    imgs[5]!.sha256 = imgs[4]!.sha256;
    expect(validateDemoDataset(dataset, manifest, { requirePhotos: true }).errors.join("\n")).toMatch(/duplicate/i);

    const manifest2 = fullManifest(dataset);
    const imgs2 = manifest2.images.filter((i) => i.propertyKey === key);
    imgs2[2]!.dhash = imgs2[1]!.dhash.slice(0, 15) + (imgs2[1]!.dhash.endsWith("0") ? "1" : "0");
    expect(validateDemoDataset(dataset, manifest2, { requirePhotos: true }).errors.join("\n")).toMatch(/near-duplicate/i);
  });

  it("requires exactly one exterior cover", () => {
    const manifest = fullManifest(dataset);
    const imgs = manifest.images.filter((i) => i.propertyKey === dataset.properties[2]!.key);
    imgs[1]!.isCover = true;
    expect(validateDemoDataset(dataset, manifest, { requirePhotos: true }).errors.join("\n")).toMatch(/one cover/);
    const manifest2 = fullManifest(dataset);
    const imgs2 = manifest2.images.filter((i) => i.propertyKey === dataset.properties[2]!.key);
    imgs2[0]!.isCover = false;
    imgs2[1]!.isCover = true;
    expect(validateDemoDataset(dataset, manifest2, { requirePhotos: true }).errors.join("\n")).toMatch(/exterior_front/);
  });

  it("requires one coherent photo set per property", () => {
    const manifest = fullManifest(dataset);
    manifest.images.find((i) => i.propertyKey === dataset.properties[3]!.key && i.room === "kitchen")!.setId = "other-set";
    expect(validateDemoDataset(dataset, manifest, { requirePhotos: true }).errors.join("\n")).toMatch(/single photo set/);
  });

  it("requires source and permission details for photographs", () => {
    const manifest = fullManifest(dataset, "licensed_photo");
    const img = manifest.images[0]! as { license?: string };
    delete img.license;
    expect(validateDemoDataset(dataset, manifest, { requirePhotos: true }).errors.join("\n")).toMatch(/license/);
  });

  it("forbids claiming a verified location for AI-generated images and labels them", () => {
    const manifest = fullManifest(dataset);
    (manifest.images[0] as { locationVerified: boolean }).locationVerified = true;
    expect(validateDemoDataset(dataset, manifest, { requirePhotos: true }).errors.join("\n")).toMatch(/locationVerified/);
    const manifest2 = fullManifest(dataset);
    (manifest2.images[0] as { attributionText: string }).attributionText = "Photo";
    expect(validateDemoDataset(dataset, manifest2, { requirePhotos: true }).errors.join("\n")).toMatch(/AI-generated illustrative image/);
  });

  it("rejects banned listing-site sources", () => {
    const manifest = fullManifest(dataset, "licensed_photo");
    (manifest.images[0] as { sourceUrl: string }).sourceUrl = "https://www.zillow.com/homedetails/x";
    expect(validateDemoDataset(dataset, manifest, { requirePhotos: true }).errors.join("\n")).toMatch(/not an allowed source/);
  });
});

describe("buildDemoPayload", () => {
  const manifest = fullManifest(dataset);
  const payload = buildDemoPayload(dataset, manifest, "2026-09-16");

  it("uses stable ids and seed keys", () => {
    const again = buildDemoPayload(dataset, manifest, "2026-09-16");
    expect(again).toEqual(payload);
    expect(payload.sellers[0]!.id).toBe(stableId(undefined, DEMO_DATASET_ID, "seller", dataset.sellers[0]!.key));
    expect(payload.sellers[0]!.seed_key).toBe(dataset.sellers[0]!.key);
  });

  it("wires relationships by id", () => {
    const sellerIds = new Set(payload.sellers.map((s) => s.id));
    const propertyIds = new Set(payload.properties.map((p) => p.id));
    for (const p of payload.properties) expect(sellerIds.has(p.seller_id)).toBe(true);
    for (const i of payload.property_images) expect(propertyIds.has(i.property_id)).toBe(true);
    for (const o of payload.open_houses) {
      expect(propertyIds.has(o.property_id)).toBe(true);
      const property = payload.properties.find((p) => p.id === o.property_id)!;
      expect(o.seller_id).toBe(property.seller_id);
    }
  });

  it("uses content-addressed storage paths and one cover per property", () => {
    const img = manifest.images[0]!;
    expect(demoStoragePath(img)).toBe(`demo/${DEMO_DATASET_ID}/${img.propertyKey}/${img.sha256.slice(0, 12)}-00-${img.room}.webp`);
    for (const p of payload.properties) {
      expect(payload.property_images.filter((i) => i.property_id === p.id && i.is_cover)).toHaveLength(1);
    }
  });

  it("never sends a street address and keeps addresses at city/ZIP", () => {
    for (const p of payload.properties) {
      expect(p).not.toHaveProperty("address_line_1");
      expect(p.address_visibility).toBe("city_zip");
    }
  });

  it("derives open-house times from the reference date", () => {
    const first = payload.open_houses[0]!;
    const template = dataset.openHouses[0]!.template;
    expect(new Date(first.ends_at).getTime() - new Date(first.starts_at).getTime()).toBe(template.durationMinutes * 60_000);
  });

  it("carries image credits for display", () => {
    expect(payload.property_images.every((i) => i.credit === "AI-generated illustrative image")).toBe(true);
  });
});
