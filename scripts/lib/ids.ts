import { createHash } from "node:crypto";

/** Namespace for all seed data ids (a fixed, random v4 UUID). */
export const SEED_NAMESPACE = "3f0c6a52-6d0e-4d8b-9a55-8e2f3b7c1d40";

/** Joins key parts; the separator never appears in keys, so ("ab","c") differs from ("a","bc"). */
const PART_SEPARATOR = String.fromCharCode(31);

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

/** RFC 4122 version-5 UUID derived from a namespace and one or more key parts. */
export function stableId(namespace: string | undefined, ...parts: string[]): string {
  const hash = createHash("sha1")
    .update(uuidToBytes(namespace ?? SEED_NAMESPACE))
    .update(parts.join(PART_SEPARATOR), "utf8")
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
