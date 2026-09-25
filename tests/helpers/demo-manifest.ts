import { REQUIRED_ROOMS, type DemoDataset, type PhotoManifest } from "@scripts/demo/schema";

function hex(n: number, len: number) {
  return n.toString(16).padStart(len, "0").slice(-len);
}

export function fullManifest(dataset: DemoDataset, sourceType: "ai_generated" | "licensed_photo" = "ai_generated"): PhotoManifest {
  let n = 0;
  return {
    images: dataset.properties.flatMap((p) =>
      [...REQUIRED_ROOMS, "backyard" as const].map((room, order) => {
        n += 1;
        return {
          propertyKey: p.key,
          setId: `set-${p.key}`,
          file: `${p.key}/${String(order).padStart(2, "0")}-${room}.webp`,
          room,
          order,
          isCover: order === 0,
          alt: `${room.replace("_", " ")} of the ${p.title}`,
          width: 2000,
          height: 1333,
          sha256: hex(n, 64),
          // Far apart perceptual hashes (distinct photos).
          dhash: hex(n * 0x1111111111111, 16),
          ...(sourceType === "ai_generated"
            ? { sourceType, generator: "test-model", attributionText: "AI-generated illustrative image", locationVerified: false }
            : { sourceType, sourceUrl: `https://example.org/${n}`, license: "CC BY 4.0", attributionText: `Photo by Someone, CC BY 4.0`, locationVerified: true }),
        };
      }),
    ),
  };
}

