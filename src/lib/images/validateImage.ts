/**
 * Never trust a claimed file extension or browser-reported MIME type.
 * Only these three magic-byte signatures are accepted; SVG (XML
 * text), HTML, executables, and corrupt files are all rejected.
 */
export type SniffedImageType = "jpeg" | "png" | "webp";

export function sniffImageType(buffer: Buffer): SniffedImageType | null {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSig)) {
    return "png";
  }

  // WebP: "RIFF"...."WEBP"
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}
