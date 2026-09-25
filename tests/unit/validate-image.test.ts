import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/images/validateImage";

describe("sniffImageType", () => {
  it("recognizes a JPEG by magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(sniffImageType(buf)).toBe("jpeg");
  });

  it("recognizes a PNG by magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImageType(buf)).toBe("png");
  });

  it("recognizes a WebP by RIFF/WEBP magic bytes", () => {
    const buf = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(sniffImageType(buf)).toBe("webp");
  });

  it("rejects an HTML file disguised with a .jpg name", () => {
    const buf = Buffer.from("<html><body>not an image</body></html>", "utf-8");
    expect(sniffImageType(buf)).toBeNull();
  });

  it("rejects an SVG (XML text, not a raster format)", () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf-8");
    expect(sniffImageType(buf)).toBeNull();
  });

  it("rejects a truncated/corrupt buffer", () => {
    expect(sniffImageType(Buffer.from([0xff]))).toBeNull();
  });

  it("rejects an executable (MZ header)", () => {
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    expect(sniffImageType(buf)).toBeNull();
  });
});
