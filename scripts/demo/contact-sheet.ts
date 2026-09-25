/**
 * Writes a local HTML contact sheet of every demo gallery next to its sample
 * listing details, for a human consistency review before seeding.
 *
 *   npm run demo:contact-sheet   → supabase/demo/wny-demo-2026/.review/contact-sheet.html
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { demoDataset } from "../../supabase/demo/wny-demo-2026/dataset";
import { photoManifestSchema, validateDemoDataset } from "./schema";

const base = path.resolve(import.meta.dirname, "../../supabase/demo/wny-demo-2026");

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

async function main() {
  const manifest = photoManifestSchema.parse(JSON.parse(await readFile(path.join(base, "images/manifest.json"), "utf8")));
  const { errors, photoGaps } = validateDemoDataset(demoDataset, manifest, { requirePhotos: true });
  const sections = demoDataset.properties.map((p) => {
    const imgs = manifest.images.filter((i) => i.propertyKey === p.key);
    const gap = photoGaps.find((g) => g.propertyKey === p.key);
    const tiles = imgs
      .map(
        (i) => `<figure><img src="${pathToFileURL(path.join(base, "images", i.file)).href}" alt="${esc(i.alt)}"><figcaption>${i.order}. ${esc(i.room)}${i.isCover ? " (cover)" : ""}<br>${esc(i.attributionText)}</figcaption></figure>`,
      )
      .join("");
    return `<section><h2>${esc(p.title)}</h2>
      <p>${esc(p.city)} · ${p.bedrooms} bd · ${p.fullBathrooms + p.halfBathrooms / 2} ba · ${p.squareFeet} sqft · built ${p.yearBuilt} · ${p.listingStatus}</p>
      <p><strong>Photo brief:</strong> ${esc(p.photoBrief)}</p>
      ${gap ? `<p class="gap">Incomplete: ${gap.photoCount} distinct photos${gap.missingRooms.length ? `, missing ${gap.missingRooms.join(", ")}` : ""}</p>` : ""}
      <div class="grid">${tiles || "<em>No photos yet</em>"}</div></section>`;
  });
  const html = `<!doctype html><meta charset="utf-8"><title>Demo gallery review</title>
  <style>body{font:14px system-ui;margin:24px;max-width:1200px}section{margin-bottom:40px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  img{width:100%;aspect-ratio:3/2;object-fit:cover}figure{margin:0}.gap{color:#a00}pre{white-space:pre-wrap}</style>
  <h1>Demo gallery review</h1><p>Check that every gallery shows one house that matches its details.</p>
  ${errors.length ? `<pre class="gap">${esc(errors.join("\n"))}</pre>` : "<p>All galleries pass automated checks.</p>"}
  ${sections.join("")}`;
  const outDir = path.join(base, ".review");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "contact-sheet.html"), html);
  console.log(`Wrote ${path.join(outDir, "contact-sheet.html")}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
