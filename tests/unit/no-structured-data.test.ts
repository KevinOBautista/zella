// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f);
    return statSync(full).isDirectory() ? files(full) : /\.(tsx?|jsx?)$/.test(f) ? [full] : [];
  });
}

describe("structured data", () => {
  it("is not published anywhere, so demo listings can never appear as offers", () => {
    const offenders = files(path.resolve(import.meta.dirname, "../../src")).filter((f) => /application\/ld\+json|schema\.org/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
