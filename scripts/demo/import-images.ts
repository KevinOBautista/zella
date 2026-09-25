/**
 * Imports one property's photo set into the demo dataset.
 *
 *   npm run demo:import-images -- --property=<propertyKey> --source=<dir>
 *
 * The source directory holds one file per room, named by room
 * (exterior_front.jpg, living_room.png, kitchen.webp, …), plus source.json:
 *
 *   {
 *     "setId": "unique id for this shoot or generated house",
 *     "sourceType": "licensed_photo" | "permission_granted" | "ai_generated",
 *     "sourceUrl": "...", "license": "...", "permissionRef": "...", "generator": "...",
 *     "attributionText": "...", "locationVerified": false,
 *     "alt": { "exterior_front": "…", "living_room": "…", … }
 *   }
 *
 * Files are auto-rotated, stripped of metadata, resized to a 2000px long
 * edge, saved as WebP (q82) under images/<propertyKey>/, and recorded in
 * images/manifest.json (replacing that property's previous entries).
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { differenceHash } from "./image-hash";
import { REQUIRED_ROOMS, ROOMS, hammingDistance, manifestImageSchema, NEAR_DUPLICATE_DISTANCE, photoManifestSchema, type ManifestImage } from "./schema";

const LONG_EDGE = 2000;
const MIN_SOURCE_LONG_EDGE = 1600;
const ROOM_ORDER: readonly string[] = ROOMS;

export async function importPropertyImages(args: { propertyKey: string; sourceDir: string; imagesDir: string; manifestPath: string }) {
  const { propertyKey, sourceDir, imagesDir, manifestPath } = args;
  if (!/^[a-z0-9-]+$/.test(propertyKey)) throw new Error(`Invalid property key "${propertyKey}".`);

  const meta = JSON.parse(await readFile(path.join(sourceDir, "source.json"), "utf8")) as Record<string, unknown> & { alt?: Record<string, string> };
  const files = (await readdir(sourceDir)).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f));

  const entries = files.map((file) => {
    const room = path.parse(file).name.toLowerCase();
    if (!ROOM_ORDER.includes(room)) throw new Error(`"${file}" is not named after a known room (${ROOMS.join(", ")}).`);
    const alt = meta.alt?.[room];
    if (!alt) throw new Error(`source.json is missing alt text for ${room}.`);
    return { file, room, alt };
  });
  const rooms = new Set(entries.map((e) => e.room));
  if (rooms.size !== entries.length) throw new Error("Each room may appear only once per import.");
  for (const r of REQUIRED_ROOMS) if (!rooms.has(r)) throw new Error(`Missing required room photo: ${r}.`);
  entries.sort((a, b) => ROOM_ORDER.indexOf(a.room) - ROOM_ORDER.indexOf(b.room));

  const processed: { entry: (typeof entries)[number]; bytes: Buffer; width: number; height: number; sha256: string; dhash: string }[] = [];
  for (const entry of entries) {
    const input = await readFile(path.join(sourceDir, entry.file));
    const info = await sharp(input).rotate().metadata();
    const longEdge = Math.max(info.autoOrient?.width ?? info.width ?? 0, info.autoOrient?.height ?? info.height ?? 0);
    if (longEdge < MIN_SOURCE_LONG_EDGE) throw new Error(`${entry.file} is too small (resolution ${longEdge}px; need at least ${MIN_SOURCE_LONG_EDGE}px on the long edge).`);
    const { data, info: out } = await sharp(input)
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const dhash = await differenceHash(data);
    const twin = processed.find((p) => hammingDistance(p.dhash, dhash) <= NEAR_DUPLICATE_DISTANCE);
    if (twin) throw new Error(`${entry.file} looks like a duplicate or crop of ${twin.entry.file}.`);
    processed.push({ entry, bytes: data, width: out.width, height: out.height, sha256: createHash("sha256").update(data).digest("hex"), dhash });
  }

  const manifest = photoManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  const propertyDir = path.join(imagesDir, propertyKey);
  await rm(propertyDir, { recursive: true, force: true });
  await mkdir(propertyDir, { recursive: true });

  const { alt: _alt, ...source } = meta;
  const newEntries: ManifestImage[] = [];
  for (const [order, p] of processed.entries()) {
    const file = `${propertyKey}/${String(order).padStart(2, "0")}-${p.entry.room}.webp`;
    await writeFile(path.join(imagesDir, file), p.bytes);
    newEntries.push(
      manifestImageSchema.parse({
        ...source,
        propertyKey,
        file,
        room: p.entry.room,
        order,
        isCover: p.entry.room === "exterior_front",
        alt: p.entry.alt,
        width: p.width,
        height: p.height,
        sha256: p.sha256,
        dhash: p.dhash,
      }),
    );
  }

  const images = [...manifest.images.filter((i) => i.propertyKey !== propertyKey), ...newEntries].sort(
    (a, b) => a.propertyKey.localeCompare(b.propertyKey) || a.order - b.order,
  );
  await writeFile(manifestPath, `${JSON.stringify({ images }, null, 2)}\n`);
  return { imported: newEntries.length, files: newEntries.map((e) => e.file) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const argv = process.argv.slice(2);
  const get = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const propertyKey = get("property");
  const sourceDir = get("source");
  if (!propertyKey || !sourceDir) {
    console.error("Usage: npm run demo:import-images -- --property=<propertyKey> --source=<dir>");
    process.exit(1);
  }
  const base = path.resolve(import.meta.dirname, "../../supabase/demo/wny-demo-2026/images");
  importPropertyImages({ propertyKey, sourceDir: path.resolve(sourceDir), imagesDir: base, manifestPath: path.join(base, "manifest.json") })
    .then((r) => console.log(`Imported ${r.imported} photos:\n  ${r.files.join("\n  ")}\nReview with: npm run demo:contact-sheet`))
    .catch((err: unknown) => {
      console.error((err as Error).message);
      process.exit(1);
    });
}
