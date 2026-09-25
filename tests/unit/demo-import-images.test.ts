// @vitest-environment node
import { mkdtemp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { differenceHash } from "@scripts/demo/image-hash";
import { importPropertyImages } from "@scripts/demo/import-images";
import { hammingDistance, NEAR_DUPLICATE_DISTANCE, photoManifestSchema } from "@scripts/demo/schema";

/** A synthetic "photo": a gradient plus a shape whose position depends on seed. */
async function synthetic(seed: number, width = 2400, height = 1600): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" x2="${seed % 2}" y1="${(seed + 1) % 2}" y2="1">
      <stop offset="0" stop-color="#${((seed * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(0, 6)}"/>
      <stop offset="1" stop-color="#${((seed * 40503) >>> 4).toString(16).padStart(6, "0").slice(0, 6)}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="${(seed * 397) % (width - 600)}" y="${(seed * 211) % (height - 600)}" width="600" height="500" fill="#${seed % 2 ? "ffffff" : "000000"}"/>
    <circle cx="${(seed * 733) % width}" cy="${(seed * 97) % height}" r="${200 + (seed % 5) * 60}" fill="#${seed % 3 ? "224488" : "cc3311"}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

describe("differenceHash", () => {
  it("treats a resized or recompressed copy as a near-duplicate", async () => {
    const original = await synthetic(3);
    const resized = await sharp(original).resize(1200).jpeg({ quality: 60 }).toBuffer();
    expect(hammingDistance(await differenceHash(original), await differenceHash(resized))).toBeLessThanOrEqual(NEAR_DUPLICATE_DISTANCE);
  });

  it("treats different photos as distinct", async () => {
    const a = await differenceHash(await synthetic(3));
    const b = await differenceHash(await synthetic(8));
    expect(hammingDistance(a, b)).toBeGreaterThan(NEAR_DUPLICATE_DISTANCE);
  });
});

describe("importPropertyImages", () => {
  let dir: string;
  let source: string;
  let out: string;
  let manifestPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "demo-import-"));
    source = path.join(dir, "incoming");
    out = path.join(dir, "images");
    manifestPath = path.join(out, "manifest.json");
    await mkdir(source, { recursive: true });
    await mkdir(out, { recursive: true });
    await writeFile(manifestPath, JSON.stringify({ images: [] }));
    const rooms = ["exterior_front", "living_room", "kitchen", "bedroom", "bathroom", "backyard"];
    for (const [i, room] of rooms.entries()) await writeFile(path.join(source, `${room}.jpg`), await synthetic(i + 11));
    await writeFile(
      path.join(source, "source.json"),
      JSON.stringify({
        setId: "gen-kenmore-01",
        sourceType: "ai_generated",
        generator: "example-image-model",
        attributionText: "AI-generated illustrative image",
        locationVerified: false,
        alt: {
          exterior_front: "Front of a two-story home with a covered porch",
          living_room: "Living room with hardwood floors",
          kitchen: "Renovated kitchen with white cabinets",
          bedroom: "Bedroom with two windows",
          bathroom: "Bathroom with a tub and tile surround",
          backyard: "Fenced backyard with a patio",
        },
      }),
    );
  });

  it("writes optimized WebP files and a valid manifest entry per photo", async () => {
    const result = await importPropertyImages({ propertyKey: "kenmore-colonial", sourceDir: source, imagesDir: out, manifestPath });
    expect(result.imported).toBe(6);
    const manifest = photoManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
    expect(manifest.images).toHaveLength(6);
    const cover = manifest.images.find((i) => i.isCover)!;
    expect(cover).toMatchObject({ room: "exterior_front", order: 0, file: "kenmore-colonial/00-exterior_front.webp" });
    const meta = await sharp(path.join(out, cover.file)).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBe(2000);
    expect(meta.exif).toBeUndefined();
    expect((await readdir(path.join(out, "kenmore-colonial"))).sort()).toHaveLength(6);
  });

  it("replaces a property's previous entries and leaves other properties alone", async () => {
    await writeFile(
      manifestPath,
      JSON.stringify({ images: [{ propertyKey: "other", setId: "x", file: "other/00-exterior_front.webp", room: "exterior_front", order: 0, isCover: true, alt: "Other house front", width: 2000, height: 1333, sha256: "a".repeat(64), dhash: "0".repeat(16), sourceType: "ai_generated", generator: "g", attributionText: "AI-generated illustrative image", locationVerified: false }] }),
    );
    await importPropertyImages({ propertyKey: "kenmore-colonial", sourceDir: source, imagesDir: out, manifestPath });
    await importPropertyImages({ propertyKey: "kenmore-colonial", sourceDir: source, imagesDir: out, manifestPath });
    const manifest = photoManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
    expect(manifest.images.filter((i) => i.propertyKey === "kenmore-colonial")).toHaveLength(6);
    expect(manifest.images.filter((i) => i.propertyKey === "other")).toHaveLength(1);
  });

  it("rejects unknown room names, missing alt text and low-resolution files", async () => {
    await writeFile(path.join(source, "garage_interior.jpg"), await synthetic(40));
    await expect(importPropertyImages({ propertyKey: "kenmore-colonial", sourceDir: source, imagesDir: out, manifestPath })).rejects.toThrow(/room/);
  });

  it("rejects photos below the minimum resolution", async () => {
    await writeFile(path.join(source, "bedroom.jpg"), await synthetic(12, 800, 600));
    await expect(importPropertyImages({ propertyKey: "kenmore-colonial", sourceDir: source, imagesDir: out, manifestPath })).rejects.toThrow(/resolution/);
  });

  it("refuses sets that contain the same photo twice", async () => {
    await writeFile(path.join(source, "exterior_other.jpg"), await sharp(await synthetic(11)).resize(2200).toBuffer());
    const meta = JSON.parse(await readFile(path.join(source, "source.json"), "utf8"));
    meta.alt.exterior_other = "Side view of the same home";
    await writeFile(path.join(source, "source.json"), JSON.stringify(meta));
    await expect(importPropertyImages({ propertyKey: "kenmore-colonial", sourceDir: source, imagesDir: out, manifestPath })).rejects.toThrow(/duplicate/);
  });
});
