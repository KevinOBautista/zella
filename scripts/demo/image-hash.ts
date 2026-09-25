import sharp from "sharp";

/**
 * 64-bit difference hash: grayscale 9×8 thumbnail, one bit per horizontal
 * neighbor comparison. Resized or recompressed copies of the same photo land
 * within a few bits of each other; different photos do not.
 */
export async function differenceHash(input: Buffer | string): Promise<string> {
  const { data } = await sharp(input).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * 9 + x]!;
      const right = data[y * 9 + x + 1]!;
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}
