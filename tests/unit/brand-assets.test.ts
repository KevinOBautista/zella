import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";

// Every root-relative asset the brand config points at must be served from
// public/, otherwise shared links render without a preview image.
function assetPaths(value: unknown): string[] {
  if (typeof value === "string") return /^\/[^/].*\.\w+$/.test(value) ? [value] : [];
  if (value && typeof value === "object") return Object.values(value).flatMap(assetPaths);
  return [];
}

describe("brand assets", () => {
  it("only references files that exist in public/", () => {
    const missing = assetPaths(brand).filter((p) => !existsSync(path.join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
  });
});
