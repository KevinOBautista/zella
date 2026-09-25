import { describe, expect, it } from "vitest";
import { buildSitemapEntries } from "@/features/seo/sitemap";

describe("buildSitemapEntries", () => {
  const entries = buildSitemapEntries(
    "https://example.test/",
    [
      { slug: "12-real-st-buffalo-ny", published_at: "2026-09-01T00:00:00Z", is_demo: false },
      { slug: "demo-kenmore-colonial", published_at: "2026-09-01T00:00:00Z", is_demo: true },
    ],
    [
      { username: "realseller", created_at: null, is_demo: false },
      { username: "demo.harborline", created_at: null, is_demo: true },
    ],
  );
  const urls = entries.map((e) => e.url);

  it("includes real listings and sellers", () => {
    expect(urls).toContain("https://example.test/homes/12-real-st-buffalo-ny");
    expect(urls).toContain("https://example.test/@realseller");
    expect(urls).toContain("https://example.test");
  });

  it("never includes demo content", () => {
    expect(urls.join(" ")).not.toMatch(/demo/);
  });
});
